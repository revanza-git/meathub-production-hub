ALTER TABLE public.support_conversations ADD COLUMN last_sender_kind text;
UPDATE public.support_conversations c SET last_sender_kind=(SELECT sender_kind FROM public.support_messages m WHERE m.conversation_id=c.id ORDER BY created_at DESC LIMIT 1);
CREATE OR REPLACE FUNCTION public.support_post_message(_conversation uuid,_id uuid,_kind text,_sender uuid,_name text,_body text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer;
BEGIN
 PERFORM 1 FROM public.support_conversations WHERE id=_conversation FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.support_messages WHERE id=_id AND (conversation_id<>_conversation OR sender_kind<>_kind OR sender_id IS DISTINCT FROM _sender)) THEN RAISE EXCEPTION 'Invalid message identity'; END IF;
 INSERT INTO public.support_messages(id,conversation_id,sender_kind,sender_id,sender_name,body) VALUES(_id,_conversation,_kind,_sender,_name,btrim(_body)) ON CONFLICT(id) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=0 THEN RETURN false; END IF;
 UPDATE public.support_conversations SET status='active',last_sender_kind=_kind,last_message=left(btrim(_body),180),last_message_at=now(),admin_unread=CASE WHEN _kind='customer' THEN admin_unread+1 ELSE 0 END,customer_unread=CASE WHEN _kind='admin' THEN customer_unread+1 ELSE 0 END WHERE id=_conversation;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.support_post_message(uuid,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.support_post_message(uuid,uuid,text,uuid,text,text) TO service_role;