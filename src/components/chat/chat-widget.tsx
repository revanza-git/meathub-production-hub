import { useState } from 'react';
import { MessageCircle, X, Maximize2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useBi } from '@/lib/i18n';
import { CustomerChat } from './customer-chat';
export function ChatWidget(){const [open,setOpen]=useState(false),bi=useBi();return <div className="fixed bottom-5 right-5 z-[60]">{open?<section aria-label="Chat Meatlink" className="mb-3 flex h-[min(620px,75dvh)] w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden rounded-md border border-line bg-background shadow-xl"><div className="flex items-center justify-between border-b border-line bg-noir px-4 py-3 text-bone"><span className="font-display text-lg">Chat Meatlink</span><div className="flex gap-1"><Button asChild variant="ghost" size="icon" title={bi('Buka halaman chat','Open chat page')}><Link to="/chat"><Maximize2/></Link></Button><Button variant="ghost" size="icon" aria-label={bi('Tutup chat','Close chat')} onClick={()=>setOpen(false)}><X/></Button></div></div><CustomerChat /></section>:null}<div className="flex justify-end"><Button size="lg" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><MessageCircle/>{bi('Chat Meatlink','Chat Meatlink')}</Button></div></div>;}
