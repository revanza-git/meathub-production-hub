import { expect, it } from "vitest";
import { chatImageSchema, matchesChatImage } from "./chat-image";
it("accepts a photo up to 5 MB", () => { expect(chatImageSchema.safeParse({name:"stock.jpg",type:"image/jpeg",size:5*1024*1024}).success).toBe(true); });
it("rejects photos over 5 MB", () => { expect(chatImageSchema.safeParse({name:"stock.jpg",type:"image/jpeg",size:5*1024*1024+1}).success).toBe(false); });
it("rejects non-image attachments", () => { expect(chatImageSchema.safeParse({name:"a.svg",type:"image/svg+xml",size:10}).success).toBe(false); });
it("rejects disguised files", () => { expect(matchesChatImage(new TextEncoder().encode('<html>'), 'image/png')).toBe(false); expect(matchesChatImage(new Uint8Array([255,216,255]),'image/jpeg')).toBe(true); });