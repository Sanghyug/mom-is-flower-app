export type Wallet = { balance: number; day: string; searches: number; shares: number; ads: number; cardShares?: number };
export type Operation = { hash: string; status: 'pending' | 'done' | 'refunded'; result?: Record<string, unknown> };
export class CreditError extends Error {
  status: number;
  constructor(code: string, status: number) { super(code); this.status = status; }
}
export function creditDay(now = Date.now()) { return new Date(now + 9 * 3600000).toISOString().slice(0, 10); }
