import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  listCourierDeliveries,
  courierStartDelivery,
  courierPostLocation,
  courierCompleteDelivery,
} from "@/lib/fulfillment.functions";

export const Route = createFileRoute("/_authenticated/partner/courier/deliveries")({
  head: () => ({ meta: [{ title: "Kurir — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: CourierDeliveriesPage,
});

type Job = {
  id: string;
  queue_number: string;
  status: string;
  scheduled_date: string;
  vehicle_label: string | null;
  picked_up_at?: string | null;
  delivered_at: string | null;
  fulfillment: { order: { order_no: string; address: { line1: string; city: string | null } | null } | null } | null;
};

function CourierDeliveriesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCourierDeliveries);
  const startFn = useServerFn(courierStartDelivery);
  const postFn = useServerFn(courierPostLocation);
  const doneFn = useServerFn(courierCompleteDelivery);

  const { data } = useQuery({ queryKey: ["courier-deliveries"], queryFn: () => listFn() as Promise<Job[]> });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["courier-deliveries"] });

  const startMut = useMutation({ mutationFn: (id: string) => startFn({ data: { job_id: id } }), onSuccess: () => { toast.success("Mulai"); invalidate(); }, onError: (e: Error) => toast.error(e.message) });
  const doneMut = useMutation({
    mutationFn: (v: { job_id: string; signature_name: string; notes?: string }) => doneFn({ data: v }),
    onSuccess: () => { toast.success("Selesai diantar"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const pingMut = useMutation({
    mutationFn: (v: { job_id: string; lat: number; lng: number }) => postFn({ data: v }),
    onSuccess: () => toast.success("Lokasi terkirim"),
    onError: (e: Error) => toast.error(e.message),
  });

  const ping = (id: string) => {
    if (!navigator.geolocation) { toast.error("Geolocation tidak tersedia"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => pingMut.mutate({ job_id: id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => toast.error(err.message),
    );
  };

  return (
    <AppShell title="Kurir" subtitle="Delivery hari ini">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {(data ?? []).map((j) => (
          <JobCard key={j.id} job={j} onStart={() => startMut.mutate(j.id)} onPing={() => ping(j.id)} onComplete={(name, notes) => doneMut.mutate({ job_id: j.id, signature_name: name, notes })} />
        ))}
        {data && data.length === 0 ? <div className="text-sm text-muted-foreground">Tidak ada tugas.</div> : null}
      </div>
    </AppShell>
  );
}

function JobCard({ job, onStart, onPing, onComplete }: { job: Job; onStart: () => void; onPing: () => void; onComplete: (name: string, notes?: string) => void }) {
  const [sig, setSig] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{job.queue_number} · {job.fulfillment?.order?.order_no ?? "—"}</CardTitle>
          <Badge variant="outline">{job.status.replaceAll("_"," ")}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {job.fulfillment?.order?.address?.line1} {job.fulfillment?.order?.address?.city ? `· ${job.fulfillment.order.address.city}` : ""}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {job.status === "ASSIGNED" ? <Button onClick={onStart}>Mulai delivery</Button> : null}
        {job.status === "IN_TRANSIT" ? (
          <>
            <Button variant="outline" onClick={onPing}>Kirim lokasi sekarang</Button>
            <div className="flex flex-wrap items-end gap-2 pt-2">
              <Input placeholder="Nama penerima" value={sig} onChange={(e) => setSig(e.target.value)} />
              <Input placeholder="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button onClick={() => onComplete(sig, notes || undefined)} disabled={sig.trim().length < 2}>Tandai selesai</Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
