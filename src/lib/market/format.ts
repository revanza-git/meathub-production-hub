export const rupiah = (n: number) =>
  `Rp${Math.round(n).toLocaleString("id-ID")}`;

export const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const tanggalJam = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const beratLabel = (gram: number) =>
  gram >= 1000 ? `${(gram / 1000).toLocaleString("id-ID")} kg` : `${gram} gram`;
