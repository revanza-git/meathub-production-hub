export function composeChatMessage(body: string, context = "") {
  const text = body.trim();
  return context && !text.includes(context) ? `${context}\n\n${text}` : text;
}