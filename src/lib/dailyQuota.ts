import { CreditError, creditDay, type Wallet, type Operation } from './creditPolicy.ts';
export const dailyFreeLimit = 5;
export function dailyWallet(wallet?: Wallet, now = Date.now()): Wallet {
  const day = creditDay(now);
  const searches = wallet?.day === day ? wallet.searches : 0;
  if (!Number.isSafeInteger(searches) || searches < 0) throw new CreditError('WALLET_INVALID', 503);
  return { balance: Math.max(0, dailyFreeLimit - searches), day, searches, shares: 0, ads: 0, cardShares: 0 };
}
export function reserveDaily(wallet: Wallet, operation: Operation | undefined, hash: string, now = Date.now()) {
  const next = dailyWallet(wallet, now);
  if (operation) {
    if (operation.hash !== hash) throw new CreditError('REQUEST_CHANGED', 409);
    if (operation.status === 'done') return { wallet: next, operation, cached: operation.result };
    if (operation.status === 'pending') throw new CreditError('REQUEST_PENDING', 409);
  }
  if (next.balance < 1) throw new CreditError('DAILY_LIMIT', 429);
  return { wallet: dailyWallet({ ...next, searches: next.searches + 1 }, now), operation: { hash, status: 'pending', day: next.day } as Operation & { day: string }, cached: undefined };
}
export function settleDaily(wallet: Wallet, operation: Operation & { day?: string }, result: Record<string, unknown> | null, now = Date.now()) {
  const next = dailyWallet(wallet, now);
  if (operation.status !== 'pending') return { wallet: next, operation };
  if (result) return { wallet: next, operation: { ...operation, status: 'done', result } as Operation };
  const searches = operation.day === next.day ? Math.max(0, next.searches - 1) : next.searches;
  return { wallet: dailyWallet({ ...next, searches }, now), operation: { ...operation, status: 'refunded' } as Operation };
}
