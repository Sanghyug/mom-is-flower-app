import { randomBytes } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { CreditError, grantCredit, type Wallet } from '../src/lib/creditPolicy.ts';
import { html } from './sharePolicy.ts';

export const validReferralCode = (code: unknown): code is string => typeof code === 'string' && /^[A-Za-z0-9_-]{24}$/.test(code);

export async function referralLink(db: Firestore, uid: string) {
  const own = db.collection('plant_referral_links').doc(uid);
  const code = randomBytes(18).toString('base64url');
  return db.runTransaction(async tx => {
    const previous = (await tx.get(own)).data();
    if (validReferralCode(previous?.code)) return previous.code;
    const token = db.collection('plant_referral_codes').doc(code);
    tx.create(token, { uid, createdAt: Date.now() });
    tx.set(own, { code, createdAt: Date.now() });
    return code;
  });
}

// Called only inside the successful AI settlement transaction, before any writes.
// A member document is created at the first wallet connection, never by a claim endpoint.
export async function qualifyReferral(tx: Transaction, db: Firestore, uid: string, requestId: string, now = Date.now()) {
  const memberRef = db.collection('plant_referral_members').doc(uid);
  const member = (await tx.get(memberRef)).data();
  if (!member || member.firstSuccessAt) return;
  const inviter = typeof member.inviterUid === 'string' && member.inviterUid !== uid ? member.inviterUid : null;
  const inviterRef = inviter ? db.collection('plant_credit_wallets').doc(inviter) : null;
  const inviterWallet = inviterRef ? (await tx.get(inviterRef)).data() : null;
  let rewardStatus = 'ineligible';
  let next: Wallet | undefined;
  if (inviterWallet) {
    try { next = grantCredit(inviterWallet as Wallet, 'share', false, now); rewardStatus = 'granted'; }
    catch (error) {
      if (!(error instanceof CreditError) || error.message !== 'REWARD_DAILY_LIMIT') throw error;
      rewardStatus = 'daily_limit';
    }
  }
  if (next && inviterRef) tx.set(inviterRef, next);
  tx.set(memberRef, { ...member, firstSuccessAt: now, requestId, rewardStatus });
}

export function renderReferralPage(code: string, origin: string, testDeploymentId?: string) {
  const web = `${origin}/?ref=${code}`;
  const test = testDeploymentId && /^[0-9a-f-]{36}$/.test(testDeploymentId) ? testDeploymentId : null;
  const toss = test ? `intoss-private://mom-is-flower?_deploymentId=${test}&host=appsInTossHost&ref=${code}` : `intoss://mom-is-flower?ref=${code}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="함께 나만의 정원을 만들어요 · 엄마는꽃"><meta property="og:description" content="꽃과 나무의 이름을 찾고, 나만의 식물카드를 모아 보세요."><meta property="og:image" content="${html(origin)}/mom-is-flower-share.png"><title>친구의 정원 초대 · 엄마는꽃</title><style>body{margin:0;background:#faf9f5;color:#315c46;font:18px/1.8 system-ui,sans-serif}main{max-width:480px;margin:56px auto;padding:24px}h1{font-size:30px}a{display:block;background:#315c46;color:white;padding:16px;text-align:center;border-radius:14px;margin:18px 0;text-decoration:none}small{display:block;color:#687367}img{width:100%;border-radius:18px}</style></head><body><main><img src="${html(origin)}/flower-hero.webp" alt="햇살 아래 피어난 코스모스"><h1>함께 나만의 정원을<br>만들어 볼까요?</h1><p>친구가 엄마는꽃에 초대했어요. 꽃과 나무의 이름을 찾고, 그날의 마음을 식물카드에 담아 보세요.</p><a href="${html(toss)}">${test ? '토스 테스트 버전으로 시작하기' : '토스에서 초대받아 시작하기'}</a><a href="${html(web)}">웹에서 초대받아 시작하기</a><small>처음 연결한 새 계정이 식물 찾기에 처음 성공하면 초대한 친구에게 돋보기 5개가 지급돼요. 초대한 친구는 하루 최대 3명까지 보상받아요. 단순 접속·링크 공유만으로는 지급되지 않아요.</small><small>기존 계정은 초대 보상 대상이 아니에요. 웹과 토스는 계정·도감이 따로 보관될 수 있으니 사용할 환경을 선택해 주세요.</small></main></body></html>`;
}
