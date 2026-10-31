import { z } from "zod";
export const CHAT_IMAGE_LIMIT = 5 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const chatImageSchema = z.object({ name: z.string().min(1).max(160), size: z.number().int().min(1).max(CHAT_IMAGE_LIMIT), type: z.enum(CHAT_IMAGE_TYPES) });
export function matchesChatImage(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png") return [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b);
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}