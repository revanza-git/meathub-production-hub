/** Kanal pembayaran iPaymu yang diaktifkan (client-safe, tanpa kredensial). */
export type PayChannel = {
  id: string;
  method: "va" | "qris" | "cstore";
  channel: string;
  label: string;
  group: "Virtual Account" | "QRIS" | "Gerai Retail";
  hint: string;
};

export const PAY_CHANNELS: PayChannel[] = [
  { id: "va-bca", method: "va", channel: "bca", label: "BCA Virtual Account", group: "Virtual Account", hint: "Transfer via m-BCA, KlikBCA, atau ATM." },
  { id: "va-bni", method: "va", channel: "bni", label: "BNI Virtual Account", group: "Virtual Account", hint: "Transfer via BNI Mobile atau ATM." },
  { id: "va-bri", method: "va", channel: "bri", label: "BRI Virtual Account", group: "Virtual Account", hint: "Transfer via BRImo atau ATM." },
  { id: "va-mandiri", method: "va", channel: "mandiri", label: "Mandiri Virtual Account", group: "Virtual Account", hint: "Transfer via Livin' atau ATM." },
  { id: "va-permata", method: "va", channel: "permata", label: "Permata Virtual Account", group: "Virtual Account", hint: "Transfer via PermataMobile atau ATM." },
  { id: "va-cimb", method: "va", channel: "cimb", label: "CIMB Niaga Virtual Account", group: "Virtual Account", hint: "Transfer via OCTO Mobile atau ATM." },
  { id: "qris", method: "qris", channel: "mpm", label: "QRIS (semua aplikasi)", group: "QRIS", hint: "Pindai QR dari aplikasi bank atau e-wallet apa pun." },
  { id: "cstore-alfamart", method: "cstore", channel: "alfamart", label: "Alfamart", group: "Gerai Retail", hint: "Bayar tunai di kasir Alfamart dengan kode pembayaran." },
  { id: "cstore-indomaret", method: "cstore", channel: "indomaret", label: "Indomaret", group: "Gerai Retail", hint: "Bayar tunai di kasir Indomaret dengan kode pembayaran." },
];

export function channelById(id: string) {
  return PAY_CHANNELS.find((c) => c.id === id);
}

export const DEFAULT_CHANNEL_ID = "va-bca";
