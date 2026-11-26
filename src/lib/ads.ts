export function adSenseConfig(env: Record<string, string | undefined>) {
  const client = env.VITE_ADSENSE_CLIENT?.trim() ?? '';
  const slot = env.VITE_ADSENSE_SLOT?.trim() ?? '';
  const publisherValid = /^ca-pub-\d{16}$/.test(client);
  return { client, slot, publisherValid, enabled: env.VITE_ADSENSE_ENABLED === 'true' && publisherValid && /^\d+$/.test(slot) };
}
