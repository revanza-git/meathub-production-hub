export function productChatContext(name: string, slug: string) {
  const url = `https://meatlink.id/produk/${encodeURIComponent(slug)}`;
  return `${name.slice(0, Math.max(0, 299 - url.length))}\n${url}`.slice(0, 300);
}