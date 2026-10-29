import type { Firestore } from 'firebase-admin/firestore';
import { services } from './credits.ts';
import { creditDay } from '../src/lib/creditPolicy.ts';
import { newShareToken, tokenHash, validToken, shareSnapshot, shareLifetime, shareIsActive, ShareError, type ShareSnapshot } from './sharePolicy.ts';
export function requireCardSharing() {
  if (process.env.CARD_SHARING_ENABLED !== 'true') throw new ShareError('카드 링크 공유를 준비하고 있어요. 지금은 파일로 저장해 보내 주세요.',503);
}
export async function createCardShare(uid: string, input: unknown, store?: Firestore) {
  requireCardSharing();
  const card=shareSnapshot(input);
  const token=newShareToken(); const hash=tokenHash(token); const now=Date.now();
  const db=store || services().db;
  const ref=db.collection('plant_shared_cards').doc(hash);
  const owner=db.collection('plant_card_share_owners').doc(hash);
  const limit=db.collection('plant_card_share_limits').doc(`${uid}_${creditDay(now)}`);
  await db.runTransaction(async tx => {
    const count=Number((await tx.get(limit)).data()?.count || 0);
    if(count>=20)throw new ShareError('오늘은 공유 링크를 충분히 만들었어요. 기존 링크를 이용하거나 내일 다시 만들어 주세요.',429);
    tx.create(ref,{card, expiresAt:now+shareLifetime,revoked:false});
    tx.create(owner,{uid,expiresAt:now+shareLifetime});
    tx.set(limit,{count:count+1,expiresAt:now+2*86400000});
  });
  return {token,expiresAt:now+shareLifetime};
}
export async function revokeCardShare(uid: string, token: unknown, store?: Firestore) {
  requireCardSharing();
  if(!validToken(token))throw new ShareError('공유 링크를 확인해 주세요.');
  const db=store || services().db; const hash=tokenHash(token);
  const owner=db.collection('plant_card_share_owners').doc(hash);
  const ref=db.collection('plant_shared_cards').doc(hash);
  await db.runTransaction(async tx=>{
    if((await tx.get(owner)).data()?.uid!==uid)throw new ShareError('이 링크의 공유를 중단할 권한이 없어요.',403);
    // Erase the public snapshot as well as closing the link; private archive remains untouched.
    tx.set(ref,{revoked:true,expiresAt:0});
  });
}
export async function readCardShare(token: string, store?: Firestore): Promise<ShareSnapshot | null> {
  requireCardSharing();
  const data=(await (store || services().db).collection('plant_shared_cards').doc(tokenHash(token)).get()).data();
  if(!shareIsActive(data))return null;
  return shareSnapshot(data?.card);
}
