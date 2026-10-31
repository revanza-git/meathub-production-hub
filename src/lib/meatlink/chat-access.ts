export function canReadCustomerChat(
  ownerId: string | null,
  callerId: string | null,
  storedHash: string | null,
  suppliedHash: string | null,
) {
  return ownerId
    ? ownerId === callerId
    : Boolean(storedHash && suppliedHash && storedHash === suppliedHash);
}
export const chatNotificationKey = (messageId: string) => `chat-${messageId}`;
