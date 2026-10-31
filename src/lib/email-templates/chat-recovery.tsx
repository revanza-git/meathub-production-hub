import { OpsAlertEmail } from './ops-alert';
import type { TemplateEntry } from './registry';
const Email=({url}:{url?:string})=><OpsAlertEmail heading="Pulihkan percakapan Anda" intro="Anda meminta akses kembali ke chat Meatlink. Tautan ini berlaku 15 menit dan hanya dapat digunakan sekali. Abaikan jika bukan Anda yang meminta." ctaUrl={url} ctaLabel="Buka chat saya" />;
export const template={component:Email,subject:'Akses chat Anda — Meatlink',displayName:'Pemulihan chat'} satisfies TemplateEntry;
