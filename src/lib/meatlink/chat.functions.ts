import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { chatAccessSchema, chatIdentitySchema, chatMessageSchema, CHAT_EMAIL } from './chat-schema';

async function hash(s: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))), b=>b.toString(16).padStart(2,'0')).join(''); }
function token() { return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''); }
async function identity() {
 const h=getRequestHeader('authorization');
 if(!h?.startsWith('Bearer ')) return null;
 const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];
 if(!url||!key) throw new Error('Chat sedang tidak tersedia.');
 const client=createClient(url,key,{auth:{persistSession:false}});
 const {data,error}=await client.auth.getUser(h.slice(7));
 if(error||!data.user) throw new Error('Silakan login kembali.');
 return data.user;
}
async function db() { return (await import('@/integrations/supabase/client.server')).supabaseAdmin; }
async function limit(key:string,max:number,seconds:number) {
 const client=await db(); const {data,error}=await client.rpc('support_consume_limit',{_key:await hash(key),_max:max,_seconds:seconds});
 if(error||!data) throw new Error('Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.');
}
async function access(input:z.infer<typeof chatAccessSchema>) {
 const user=await identity(),client=await db();
 const {data,error}=await client.from('support_conversations').select('*').eq('id',input.id).maybeSingle();
 if(error||!data|| !(data.user_id ? user?.id===data.user_id : input.token && data.guest_token_hash===await hash(input.token))) throw new Error('Percakapan tidak tersedia. Periksa akses Anda.');
 return {client,conversation:data,user};
}
async function alert(id:string,messageId:string,name:string) {
 try { const {sendTemplateEmail}=await import('@/lib/email-templates/send-email'); return (await sendTemplateEmail('chat-alert',CHAT_EMAIL,{idempotencyKey:`chat-${messageId}`,templateData:{name,inboxUrl:`https://meatlink.id/admin/chat?conversation=${id}`}})).sent; }
 catch { console.warn('Chat notification could not be sent'); return false; }
}
export const startChat=createServerFn({method:'POST'}).inputValidator(input=>chatIdentitySchema.extend({id:z.string().uuid(),context:z.string().trim().max(300).default('')}).parse(input)).handler(async({data})=>{
 const user=await identity();
 const ip=getRequestHeader('cf-connecting-ip')||getRequestHeader('x-forwarded-for')||'unknown';
 await limit(`start:${ip}`,5,600); await limit(`start-email:${data.email.toLowerCase()}`,5,600);
 const client=await db();
 const {data:existing}=await client.from('support_conversations').select('id,user_id').eq('id',data.id).maybeSingle();
 if(existing) { if(user&&existing.user_id===user.id) return {id:existing.id,token:undefined}; throw new Error('Mulai percakapan baru.'); }
 let name=data.name,email=data.email;
 if(user) { const {data:p}=await client.from('profiles').select('display_name,email').eq('id',user.id).maybeSingle(); name=p?.display_name||user.email||name; email=p?.email||user.email||email; }
 const secret=user?null:token();
 const {error}=await client.from('support_conversations').insert({id:data.id,user_id:user?.id||null,customer_name:name,customer_email:email.toLowerCase(),guest_token_hash:secret?await hash(secret):null,context_label:data.context});
 if(error) throw new Error('Percakapan belum dapat dibuat. Silakan coba lagi.');
 return {id:data.id,token:secret||undefined};
});
export const listMyChats=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data,error}=await context.supabase.from('support_conversations').select('id,customer_name,customer_email,context_label,status,last_message,last_message_at,customer_unread,admin_unread').eq('user_id',context.userId).order('last_message_at',{ascending:false}).limit(100);
 if(error) throw new Error('Percakapan belum dapat dimuat.'); return data||[];
});
export const readChat=createServerFn({method:'POST'}).inputValidator(input=>chatAccessSchema.parse(input)).handler(async({data})=>{
 const {client,conversation}=await access(data);
 const {data:messages,error}=await client.from('support_messages').select('id,sender_kind,sender_name,body,created_at').eq('conversation_id',data.id).order('created_at',{ascending:false}).limit(200);
 if(error) throw new Error('Pesan belum dapat dimuat.');
 // Mark only the unread count observed before the read; concurrent new messages stay unread.
 await client.from('support_conversations').update({customer_unread:0}).eq('id',data.id).eq('customer_unread',conversation.customer_unread);
 return {conversation:{id:conversation.id,customer_name:conversation.customer_name,customer_email:conversation.customer_email,context_label:conversation.context_label,status:conversation.status,last_message:conversation.last_message,last_message_at:conversation.last_message_at,customer_unread:0,admin_unread:conversation.admin_unread},messages:(messages||[]).reverse()};
});
export const sendChat=createServerFn({method:'POST'}).inputValidator(input=>chatAccessSchema.merge(chatMessageSchema).parse(input)).handler(async({data})=>{
 const {client,conversation,user}=await access(data);
 const {data:old}=await client.from('support_messages').select('conversation_id,sender_kind').eq('id',data.messageId).maybeSingle();
 if(old) { if(old.conversation_id!==data.id||old.sender_kind!=='customer') throw new Error('Pesan tidak valid.'); return {ok:true,emailSent:true}; }
 await limit(`send:${data.id}`,12,60);
 const {data:inserted,error}=await client.rpc('support_post_message',{_conversation:data.id,_id:data.messageId,_kind:'customer',_sender:user?.id,_name:conversation.customer_name,_body:data.body});
 if(error) throw new Error('Pesan belum terkirim. Silakan coba lagi.');
 const emailSent=inserted?await alert(data.id,data.messageId,conversation.customer_name):true;
 return {ok:true,emailSent};
});
async function admin(context:{supabase: Awaited<ReturnType<typeof db>>;userId:string}) { const {data}=await context.supabase.rpc('ml_has_role',{_user_id:context.userId,_role:'admin'}); if(!data) throw new Error('Akses hanya untuk admin.'); }
export const adminChats=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 await admin(context); const {data,error}=await context.supabase.from('support_conversations').select('id,customer_name,customer_email,context_label,status,last_message,last_message_at,customer_unread,admin_unread').order('last_message_at',{ascending:false}).limit(200);
 if(error) throw new Error('Chat belum dapat dimuat.'); return data||[];
});
export const adminReadChat=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
 await admin(context); const client=await db();
 const {data:conversation,error}=await client.from('support_conversations').select('id,customer_name,customer_email,context_label,status,last_message,last_message_at,customer_unread,admin_unread').eq('id',data.id).single();
 const {data:messages,error:msgError}=await client.from('support_messages').select('id,sender_kind,sender_name,body,created_at').eq('conversation_id',data.id).order('created_at',{ascending:false}).limit(200);
 if(error||msgError||!conversation) throw new Error('Percakapan tidak tersedia.');
 await client.from('support_conversations').update({admin_unread:0}).eq('id',data.id).eq('admin_unread',conversation.admin_unread);
 return {conversation,messages:(messages||[]).reverse()};
});
export const adminReplyChat=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>chatMessageSchema.extend({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
 await admin(context);const client=await db();
 const {data:old}=await client.from('support_messages').select('conversation_id,sender_id').eq('id',data.messageId).maybeSingle();
 if(old&& (old.conversation_id!==data.id||old.sender_id!==context.userId)) throw new Error('Pesan tidak valid.');
 const {data:p}=await context.supabase.from('profiles').select('display_name').eq('id',context.userId).maybeSingle();
 const {error}=await client.rpc('support_post_message',{_conversation:data.id,_id:data.messageId,_kind:'admin',_sender:context.userId,_name:p?.display_name||'Admin Meatlink',_body:data.body});
 if(error) throw new Error('Balasan belum terkirim.'); return {ok:true};
});
export const closeChat=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid(),closed:z.boolean()}).parse(input)).handler(async({data,context})=>{
 await admin(context);const client=await db(); const {error}=await client.from('support_conversations').update({status:data.closed?'closed':'active'}).eq('id',data.id);if(error) throw new Error('Status belum diperbarui.');return {ok:true};
});
export const requestChatRecovery=createServerFn({method:'POST'}).inputValidator(input=>z.object({email:z.string().email().max(255),website:z.string().max(0).default('')}).parse(input)).handler(async({data})=>{
 const ip=getRequestHeader('cf-connecting-ip')||'unknown';await limit(`recover:${ip}`,3,900);await limit(`recover-email:${data.email.toLowerCase()}`,3,900);
 const client=await db();const {data:c}=await client.from('support_conversations').select('id').is('user_id',null).eq('customer_email',data.email.toLowerCase()).order('last_message_at',{ascending:false}).limit(1).maybeSingle();
 if(c) { const secret=token();const {error}=await client.from('support_recovery_tokens').insert({conversation_id:c.id,token_hash:await hash(secret)});
 if(!error) try { const {sendTemplateEmail}=await import('@/lib/email-templates/send-email');await sendTemplateEmail('chat-recovery',data.email,{idempotencyKey:`recovery-${await hash(secret)}`,templateData:{url:`https://meatlink.id/chat#recover=${secret}`}}); } catch {console.warn('Chat recovery email could not be sent');} }
 return {ok:true};
});
export const recoverChat=createServerFn({method:'POST'}).inputValidator(input=>z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(input)).handler(async({data})=>{
 const client=await db(); const {data:r,error}=await client.from('support_recovery_tokens').delete().eq('token_hash',await hash(data.token)).gt('expires_at',new Date().toISOString()).select('conversation_id').maybeSingle();
 if(error||!r) throw new Error('Tautan pemulihan tidak valid atau kedaluwarsa.');const secret=token();const {error:updateError}=await client.from('support_conversations').update({guest_token_hash:await hash(secret)}).eq('id',r.conversation_id).is('user_id',null);
 if(updateError) throw new Error('Akses belum dapat dipulihkan.');return {id:r.conversation_id,token:secret};
});
