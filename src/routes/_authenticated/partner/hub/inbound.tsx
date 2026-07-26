import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listHubInbound,
  hubReceive,
  createDeliveryJob,
  assignCourier,
  listCouriers,
} from "@/lib/fulfillment.functions";

export const Route = createFileRoute("/_authenticated/partner/hub/inbound")({
  head: () => ({ meta: [{ title: "Hub MEATHUB" }, { name: "robots", content: "noindex" }] }),
  component: HubInboundPage,
});

type Fulfillment = {
  id: string;
  order_id: string;
  status: string;
  hub_deadline_at: string | null;
  order: { order_no: string; total_kg: number; notes: string | null } | null;
};

function HubInboundPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listHubInbound);
  const receiveFn = useServerFn(hubReceive);
  const createJobFn = useServerFn(createDeliveryJob);
  const assignFn = useServerFn(assignCourier);
  const couriersFn = useServerFn(listCouriers);

  const { data } = useQuery({ queryKey: ["hub-inbound"], queryFn: () => listFn() as Promise<Fulfillment[]> });
  const { data: couriers } = useQuery({ queryKey: ["couriers"], queryFn: () => couriersFn() });

  const receiveMut = useMutation({
    mutationFn: (v: { fulfillment_id: string; weight_kg: number; temperature_c?: number; packaging: "GOOD"|"MINOR_DAMAGE"|"MAJOR_DAMAGE"|"TEMPERATURE_BREACH" }) => receiveFn({ data: v }),
    onSuccess: () => { toast.success("Diterima di hub"); qc.invalidateQueries({ queryKey: ["hub-inbound"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const createJobMut = useMutation({
    mutationFn: (v: { fulfillment_id: string; scheduled_date: string }) => createJobFn({ data: v }),
    onSuccess: () => { toast.success("Delivery job dibuat"); qc.invalidateQueries({ queryKey: ["hub-inbound"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const assignMut = useMutation({
    mutationFn: (v: { job_id: string; courier_user_id: string; vehicle_label?: string }) => assignFn({ data: v }),
    onSuccess: () => { toast.success("Kurir ditugaskan"); qc.invalidateQueries({ queryKey: ["hub-inbound"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Hub" subtitle="Inbound & dispatch">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {(data ?? []).map((f) => (
          <HubCard
            key={f.id}
            f={f}
            couriers={couriers ?? []}
            onReceive={(v) => receiveMut.mutate({ ...v, fulfillment_id: f.id })}
            onCreateJob={(scheduled_date) => createJobMut.mutateAsync({ fulfillment_id: f.id, scheduled_date })}
            onAssign={(job_id, courier_user_id, vehicle_label) => assignMut.mutate({ job_id, courier_user_id, vehicle_label })}
          />
        ))}
        {data && data.length === 0 ? <div className="text-sm text-muted-foreground">Tidak ada inbound.</div> : null}
      </div>
    </AppShell>
  );
}

function HubCard({ f, couriers, onReceive, onCreateJob, onAssign }: {
  f: Fulfillment;
  couriers: Array<{ user_id: string; display_name: string }>;
  onReceive: (v: { weight_kg: number; temperature_c?: number; packaging: "GOOD"|"MINOR_DAMAGE"|"MAJOR_DAMAGE"|"TEMPERATURE_BREACH" }) => void;
  onCreateJob: (scheduled_date: string) => Promise<{ id: string }>;
  onAssign: (job_id: string, courier_user_id: string, vehicle_label?: string) => void;
}) {
  const [weight, setWeight] = useState<string>(String(f.order?.total_kg ?? ""));
  const [temp, setTemp] = useState<string>("");
  const [pack, setPack] = useState<"GOOD"|"MINOR_DAMAGE"|"MAJOR_DAMAGE"|"TEMPERATURE_BREACH">("GOOD");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [jobId, setJobId] = useState<string>("");
  const [courier, setCourier] = useState<string>("");
  const [vehicle, setVehicle] = useState<string>("");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Order {f.order?.order_no ?? "—"}</CardTitle>
          <Badge variant="outline">{f.status.replaceAll("_"," ")}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          Berat pesanan: {Number(f.order?.total_kg ?? 0).toFixed(2)} kg
          {f.hub_deadline_at ? ` · Deadline hub: ${new Date(f.hub_deadline_at).toLocaleString("id-ID")}` : ""}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {f.status === "AWAITING_HUB_INBOUND" || f.status === "AWAITING_VENDOR_DISPATCH" ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input placeholder="Berat (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <Input placeholder="Suhu (°C)" value={temp} onChange={(e) => setTemp(e.target.value)} />
            <Select value={pack} onValueChange={(v) => setPack(v as typeof pack)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOD">Kemasan baik</SelectItem>
                <SelectItem value="MINOR_DAMAGE">Kerusakan ringan</SelectItem>
                <SelectItem value="MAJOR_DAMAGE">Kerusakan berat</SelectItem>
                <SelectItem value="TEMPERATURE_BREACH">Suhu di luar batas</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => onReceive({
                weight_kg: Number(weight),
                temperature_c: temp ? Number(temp) : undefined,
                packaging: pack,
              })}
              disabled={!weight || Number(weight) <= 0}
            >
              Terima
            </Button>
          </div>
        ) : null}
        {f.status === "READY_FOR_DISPATCH" ? (
          <div className="space-y-2 rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Buat delivery job</div>
            <div className="flex gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button
                onClick={async () => {
                  const r = await onCreateJob(date);
                  setJobId(r.id);
                }}
              >
                Buat job
              </Button>
            </div>
            {jobId ? (
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger><SelectValue placeholder="Pilih kurir" /></SelectTrigger>
                  <SelectContent>
                    {couriers.map((c) => <SelectItem key={c.user_id} value={c.user_id}>{c.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Kendaraan" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
                <Button onClick={() => onAssign(jobId, courier, vehicle || undefined)} disabled={!courier}>
                  Assign kurir
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
