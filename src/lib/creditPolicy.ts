export const creditPolicy = {
  welcome: 10,
  identify: 1,
  shareReward: 2,
  adReward: 5,
  shareDailyLimit: 1,
  adDailyLimit: 5,
  identifyDailyLimit: 50,
  storyCost: 0,
} as const;
export type RewardKind = 'share' | 'ad';
export type Wallet = { balance: number; day: string; searches: number; shares: number; ads: number };
export type Operation = { hash: string; status: 'pending' | 'done' | 'refunded'; result?: Record<string, unknown> };
export class CreditError extends Error {
  status: number;
  constructor(code: string, status: number) { super(code); this.status = status; }
}
export function creditDay(now = Date.now()) { return new Date(now + 9 * 3600000).toISOString().slice(0, 10); }
export function initialWallet(now = Date.now()): Wallet { return { balance: creditPolicy.welcome, day: creditDay(now), searches: 0, shares: 0, ads: 0 }; }
export function currentWallet(wallet: Wallet, now = Date.now()): Wallet {
  if (!Number.isSafeInteger(wallet.balance) || wallet.balance < 0) throw new CreditError('WALLET_INVALID', 503);
  return wallet.day === creditDay(now) ? { ...wallet } : { ...wallet, day: creditDay(now), searches: 0, shares: 0, ads: 0 };
}
export function reserveCredit(wallet: Wallet, operation: Operation | undefined, hash: string, now = Date.now()) {
  const next = currentWallet(wallet, now);
  if (operation) {
    if (operation.hash !== hash) throw new CreditError('REQUEST_CHANGED', 409);
    if (operation.status === 'done') return { wallet: next, operation, cached: operation.result };
    if (operation.status === 'pending') throw new CreditError('REQUEST_PENDING', 409);
    // A refunded request can be retried with the same photo and request ID.
  }
  if (next.balance < creditPolicy.identify) throw new CreditError('NO_CREDITS', 402);
  if (next.searches >= creditPolicy.identifyDailyLimit) throw new CreditError('DAILY_LIMIT', 429);
  return { wallet: { ...next, balance: next.balance - creditPolicy.identify, searches: next.searches + 1 }, operation: { hash, status: 'pending' } as Operation, cached: undefined };
}
export function settleCredit(wallet: Wallet, operation: Operation, result: Record<string, unknown> | null) {
  if (operation.status !== 'pending') return { wallet, operation };
  if (result) return { wallet, operation: { ...operation, status: 'done', result } as Operation };
  return { wallet: { ...wallet, balance: wallet.balance + creditPolicy.identify }, operation: { hash: operation.hash, status: 'refunded' } as Operation };
}
export function grantCredit(wallet: Wallet, kind: RewardKind, duplicate: boolean, now = Date.now()) {
  const next = currentWallet(wallet, now);
  if (duplicate) return next;
  const field = kind === 'share' ? 'shares' : 'ads';
  const limit = kind === 'share' ? creditPolicy.shareDailyLimit : creditPolicy.adDailyLimit;
  if (next[field] >= limit) throw new CreditError('REWARD_DAILY_LIMIT', 429);
  const amount = kind === 'share' ? creditPolicy.shareReward : creditPolicy.adReward;
  return { ...next, balance: next.balance + amount, [field]: next[field] + 1 };
}
