import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useBi } from "@/lib/i18n";
export function ChatPhoto({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false);
  const bi = useBi();
  return <><Button variant="ghost" className="mb-2 h-auto w-full overflow-hidden p-0" onClick={() => setOpen(true)} aria-label={bi("Perbesar foto", "Enlarge photo")}><img src={url} alt={name} className="max-h-64 w-full rounded-md object-contain" loading="lazy" onLoad={(e) => { const log = e.currentTarget.closest('[role="log"]'); if (log && log.scrollHeight - log.scrollTop - log.clientHeight < 340) log.scrollTop = log.scrollHeight; }} /></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-4xl"><DialogTitle className="break-words text-sm">{name}</DialogTitle><img src={url} alt={name} className="max-h-[75dvh] w-full object-contain" /></DialogContent></Dialog></>;
}