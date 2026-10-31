import { z } from 'zod';
export const CHAT_EMAIL = 'cs@meatlink.id';
export const chatIdentitySchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(255), website: z.string().max(0).default('') });
export const chatMessageSchema = z.object({ messageId: z.string().uuid(), body: z.string().trim().min(1).max(4000) });
export const chatAccessSchema = z.object({ id: z.string().uuid(), token: z.string().regex(/^[a-f0-9]{64}$/).optional() });
export type ChatAccess = z.infer<typeof chatAccessSchema>;
export type ChatConversation = { id: string; customer_name: string; customer_email: string; context_label: string; status: string; last_message: string; last_message_at: string; customer_unread: number; admin_unread: number };
export type ChatMessage = { id: string; sender_kind: string; sender_name: string; body: string; created_at: string };
