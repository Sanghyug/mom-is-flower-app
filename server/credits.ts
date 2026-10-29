import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Transaction } from 'firebase-admin/firestore';
import { CreditError, creditDay, currentWallet, grantCredit, initialWallet, reserveCredit, settleCredit, type Operation, type RewardKind, type Wallet } from '../src/lib/creditPolicy.ts';
import type { Request, Response } from './openai.ts';

export function services() {
  const secret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!secret) throw new CreditError('CREDITS_NOT_CONFIGURED', 503);
  const app = getApps().find(item => item.name === 'flower-credits') || initializeApp({ credential: cert(JSON.parse(secret)) }, 'flower-credits');
  return { auth: getAuth(app), db: getFirestore(app) };
}
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
  const { db } = services();
  const ref = db.collection('plant_credit_wallets').doc(uid);
  const welcome = db.collection('plant_credit_signup_limits').doc(`${creditDay()}_${clientBucket(req)}`);
  return db.runTransaction(async tx => {
    const [existing, counter] = await Promise.all([tx.get(ref), tx.get(welcome)]);
    if (existing.exists) return currentWallet(existing.data() as Wallet);
    const count = Number(counter.data()?.count || 0);
    if (count >= 20) throw new CreditError('SIGNUP_LIMIT', 429);
    const wallet = initialWallet();
    tx.set(ref, wallet); tx.set(welcome, { count: count + 1, expiresAt: new Date(Date.now() + 3 * 86400000) });
    return wallet;
  });
}
export function rewardAvailability() {
  return { ad: Boolean(process.env.TOSS_REWARDED_AD_GROUP_ID), share: Boolean(process.env.TOSS_SHARE_MODULE_ID) };
}
export async function walletState(uid: string, req: Request) {
  let wallet = await ensureWallet(uid, req);
  const { db } = services();
  const ref = db.collection('plant_credit_wallets').doc(uid);
  // Recover reservations left behind by a terminated server invocation. Provider calls time out at 25s.
  const pending = await ref.collection('operations').where('status', '==', 'pending').limit(50).get();
  for (const operation of pending.docs) {
    if (Number(operation.data().createdAt) > Date.now() - 120000) continue;
    await db.runTransaction(async tx => {
      const [walletDoc, opDoc] = await Promise.all([tx.get(ref), tx.get(operation.ref)]);
      const state = settleCredit(walletDoc.data() as Wallet, opDoc.data() as Operation, null);
      tx.set(ref, state.wallet); tx.set(operation.ref, state.operation, { merge: true });
    });
  }
  if (!pending.empty) wallet = currentWallet((await ref.get()).data() as Wallet);
  return { ...wallet, rewards: rewardAvailability(), adGroupId: process.env.TOSS_REWARDED_AD_GROUP_ID || '', shareModuleId: process.env.TOSS_SHARE_MODULE_ID || '' };
}
function validId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9-]{24,80}$/.test(value); }
export async function paidRecognition(uid: string, req: Request, image: string, perform: () => Promise<Record<string, unknown>>) {
  await ensureWallet(uid, req);
  const requestId = req.body?.requestId;
  if (!validId(requestId)) throw new CreditError('REQUEST_ID_REQUIRED', 400);
  const { db } = services();
  const walletRef = db.collection('plant_credit_wallets').doc(uid);
  const operationRef = walletRef.collection('operations').doc(requestId);
  const budgetRef = db.collection('plant_credit_budget').doc(creditDay());
  const hash = digest(image);
  const cached = await db.runTransaction(async tx => {
    const [walletDoc, opDoc, budgetDoc] = await Promise.all([tx.get(walletRef), tx.get(operationRef), tx.get(budgetRef)]);
    const state = reserveCredit(walletDoc.data() as Wallet, opDoc.exists ? opDoc.data() as Operation : undefined, hash);
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
      const state = settleCredit(walletDoc.data() as Wallet, opDoc.data() as Operation, result);
      tx.set(walletRef, state.wallet); tx.set(operationRef, state.operation, { merge: true });
    });
  }
  let result: Record<string, unknown>;
  try { result = await perform(); }
  catch (error) { await finish(null); throw error; }
  await finish(result.found === false ? null : result);
  return { ...result, wallet: await walletState(uid, req) };
}
export async function startReward(uid: string, req: Request, kind: RewardKind) {
  const wallet = await ensureWallet(uid, req);
  if (!rewardAvailability()[kind]) throw new CreditError('REWARD_NOT_CONFIGURED', 503);
  // Check eligibility without applying a grant.
  grantCredit(wallet, kind, false);
  const ticket = digest(`${uid}:${creditDay()}:${kind}:${kind === 'ad' ? wallet.ads : wallet.shares}`);
  const ref = services().db.collection('plant_credit_rewards').doc(ticket);
  await services().db.runTransaction(async tx => {
    const previous = await tx.get(ref);
    if (!previous.exists || (!previous.data()?.used && Date.now() - Number(previous.data()?.createdAt) > 15 * 60000)) tx.set(ref, { uid, kind, used: false, createdAt: Date.now() });
  });
  return { ticket };
}
export async function finishReward(uid: string, req: Request) {
  const ticket = req.body?.ticket;
  if (!validId(ticket)) throw new CreditError('INVALID_REWARD', 400);
  const { db } = services();
  const rewardRef = db.collection('plant_credit_rewards').doc(ticket);
  const walletRef = db.collection('plant_credit_wallets').doc(uid);
  await db.runTransaction(async (tx: Transaction) => {
    const [receipt, walletDoc] = await Promise.all([tx.get(rewardRef), tx.get(walletRef)]);
    const data = receipt.data();
    if (!data || data.uid !== uid || !walletDoc.exists) throw new CreditError('INVALID_REWARD', 403);
    if (data.used) return;
    if (Date.now() - data.createdAt > 15 * 60000) throw new CreditError('REWARD_EXPIRED', 409);
    const event = req.body?.event;
    if ((data.kind === 'ad' && event !== 'userEarnedReward') || (data.kind === 'share' && event !== 'sendViral')) throw new CreditError('REWARD_NOT_COMPLETED', 400);
    const wallet = grantCredit(walletDoc.data() as Wallet, data.kind, false);
    tx.set(walletRef, wallet); tx.update(rewardRef, { used: true, completedAt: Date.now() });
  });
  return walletState(uid, req);
}
export function creditFailure(res: Response, error: CreditError) {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: '돋보기를 사용하려면 앱에 다시 연결해 주세요.', CREDITS_NOT_CONFIGURED: '돋보기 서비스 연결을 준비하고 있어요.',
    NO_CREDITS: '돋보기가 부족해요. 충전한 뒤 다시 찾아보세요.', REQUEST_PENDING: '같은 사진을 이미 살펴보고 있어요. 잠시 후 다시 확인해 주세요.',
    DAILY_LIMIT: '오늘의 식물 찾기 이용 한도에 도달했어요.', SERVICE_DAILY_LIMIT: '오늘 준비된 식물 찾기 수량을 모두 사용했어요. 내일 다시 만나 주세요.',
    REWARD_DAILY_LIMIT: '오늘 받을 수 있는 보상을 모두 받았어요.', REWARD_NOT_CONFIGURED: '보상 충전 연결을 준비하고 있어요.',
  };
  return res.status(error.status).json({ code: error.message, error: messages[error.message] || '돋보기 요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.' });
}
