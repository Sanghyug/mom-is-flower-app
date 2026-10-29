// Only fixed event names and coarse states. Never send images, memos or flower names.
export function track(name: string, details?: Record<string, string | boolean>) {
  const target = window as unknown as { gtag?: (command: string, event: string, parameters?: Record<string, string | boolean>) => void };
  try { target.gtag?.('event', name, details); } catch { /* Analytics must never block an interaction. */ }
}
