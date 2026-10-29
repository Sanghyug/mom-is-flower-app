export const tossDeepLink = 'intoss://mom-is-flower';
export const appEntryUrl = 'https://mom-is-flower.vercel.app/toss';
export async function getAppShareLink() {
  if (import.meta.env.MODE === 'toss') {
    try {
      const { getTossShareLink } = await import('@apps-in-toss/web-framework');
      return await getTossShareLink(tossDeepLink);
    } catch { /* The HTTPS entry page remains usable when the native helper is unavailable. */ }
  }
  return appEntryUrl;
}
