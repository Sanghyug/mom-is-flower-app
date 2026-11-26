import { dailyWallet, reserveDaily, settleDaily, dailyFreeLimit } from '../src/lib/dailyQuota.ts';
import { createHash } from 'node:crypto';
import { getFirebaseServices } from './firebase.ts';

import { CreditError, creditDay, type Operation, type Wallet } from '../src/lib/creditPolicy.ts';
import type { Request, Response } from './openai.ts';

export const services = getFirebaseServices;
export async function verifiedUser(req: Request) {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new CreditError('AUTH_REQUIRED', 401);
  try { return (await services().auth.verifyIdToken(authorization.slice(7))).uid; }
  catch (error) { if (error instanceof CreditError) throw error; throw new CreditError('AUTH_REQUIRED', 401); }
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function clientBucket(req: Request) {
  // Only use the trusted deployment proxy's address, never a client-supplied device ID.
  const ip = String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  return digest(`${process.env.CREDIT_IP_SALT || 'flower-credits'}:${ip}`);
}
async function ensureWallet(uid: string, req: Request): Promise<Wallet> {
  const db = services().db;
  const ref = db.collection('plant_web_daily_usage').doc(uid);
  const signup = db.collection('plant_web_signup_limits').doc(`${creditDay()}_${clientBucket(req)}`);
  return db.runTransaction(async tx => {
    const [existing, counter] = await Promise.all([tx.get(ref), tx.get(signup)]);
    const wallet = dailyWallet(existing.exists ? existing.data() as Wallet : undefined);
    if (!existing.exists) {
      const count = Number(counter.data()?.count || 0);
      if (count >= 20) throw new CreditError('SIGNUP_LIMIT', 429);
      tx.set(signup, { count: count + 1, expiresAt: new Date(Date.now() + 3 * 86400000) });
    }
    tx.set(ref, wallet);
    return wallet;
  });
}
export function rewardAvailability() { return { ad: false, share: false, card: false }; }
export async function walletState(uid: string, req: Request) {
  let wallet = await ensureWallet(uid, req);
  const { db } = services();
  const ref = db.collection('plant_web_daily_usage').doc(uid);
  // Recover reservations left behind by a terminated server invocation. Provider calls time out at 25s.
  const pending = await ref.collection('operations').where('status', '==', 'pending').limit(50).get();
  for (const operation of pending.docs) {
    if (Number(operation.data().createdAt) > Date.now() - 120000) continue;
    await db.runTransaction(async tx => {
      const [walletDoc, opDoc] = await Promise.all([tx.get(ref), tx.get(operation.ref)]);
      const state = settleDaily(walletDoc.data() as Wallet, opDoc.data() as Operation, null);
      tx.set(ref, state.wallet); tx.set(operation.ref, state.operation, { merge: true });
    });
  }
  if (!pending.empty) wallet = dailyWallet((await ref.get()).data() as Wallet);
  return { ...wallet, rewards: rewardAvailability(), adGroupId: '', shareModuleId: '', dailyLimit: dailyFreeLimit };
}
function validId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9-]{24,80}$/.test(value); }
export async function paidRecognition(uid: string, req: Request, image: string, perform: () => Promise<Record<string, unknown>>) {
  await ensureWallet(uid, req);
  const requestId = req.body?.requestId;
  if (!validId(requestId)) throw new CreditError('REQUEST_ID_REQUIRED', 400);
  const { db } = services();
  const walletRef = db.collection('plant_web_daily_usage').doc(uid);
  const operationRef = walletRef.collection('operations').doc(requestId);
  const budgetRef = db.collection('plant_credit_budget').doc(creditDay());
  const hash = digest(image);
  const cached = await db.runTransaction(async tx => {
    const [walletDoc, opDoc, budgetDoc] = await Promise.all([tx.get(walletRef), tx.get(operationRef), tx.get(budgetRef)]);
    const state = reserveDaily(walletDoc.data() as Wallet, opDoc.exists ? opDoc.data() as Operation : undefined, hash);
    if (state.cached) return state.cached;
    const used = Number(budgetDoc.data()?.attempts || 0);
    const limit = Number(process.env.AI_DAILY_LIMIT || 200);
    if (!Number.isSafeInteger(limit) || limit < 1 || used >= limit) throw new CreditError('SERVICE_DAILY_LIMIT', 429);
    tx.set(walletRef, state.wallet);
    tx.set(operationRef, { ...state.operation, createdAt: Date.now(), expiresAt: new Date(Date.now() + 30 * 86400000) });
    tx.set(budgetRef, { attempts: used + 1 });
    return null;
  });
  if (cached) return { ...cached, wallet: await walletState(uid, req) };
  async function finish(result: Record<string, unknown> | null) {
    return db.runTransaction(async tx => {
      const [walletDoc, opDoc] = await Promise.all([tx.get(walletRef), tx.get(operationRef)]);
      const state = settleDaily(walletDoc.data() as Wallet, opDoc.data() as Operation, result);
      tx.set(walletRef, state.wallet); tx.set(operationRef, state.operation, { merge: true });
    });
  }
  let result: Record<string, unknown>;
  try { result = await perform(); }
  catch (error) { await finish(null); throw error; }
  await finish(result.found === false ? null : result);
  return { ...result, wallet: await walletState(uid, req) };
}
export function creditFailure(res: Response, error: CreditError) {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: '무료 분석을 사용하려면 앱에 다시 연결해 주세요.', CREDITS_NOT_CONFIGURED: '무료 분석 서비스 연결을 준비하고 있어요.',
    NO_CREDITS: '오늘의 무료 분석을 모두 사용했어요. 내일 다시 찾아주세요.', REQUEST_PENDING: '같은 사진을 이미 살펴보고 있어요. 잠시 후 다시 확인해 주세요.',
    DAILY_LIMIT: '오늘의 식물 찾기 이용 한도에 도달했어요.', SERVICE_DAILY_LIMIT: '오늘 준비된 식물 찾기 수량을 모두 사용했어요. 내일 다시 만나 주세요.',
    SIGNUP_LIMIT: '오늘 이 네트워크에서 새로 연결할 수 있는 계정 수를 초과했어요. 내일 다시 이용해 주세요.',
  };
  return res.status(error.status).json({ code: error.message, error: messages[error.message] || '무료 분석 요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.' });
}
