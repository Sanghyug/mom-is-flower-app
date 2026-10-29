import { creditRequest } from './creditClient';
export async function revokeCardLinkIfPresent(cardId: string) {
  const key=`plant-card-link:${cardId}`;
  let link: {token?:unknown;expiresAt?:number}|null;
  try {link=JSON.parse(localStorage.getItem(key)||'null');} catch {throw new Error('이 카드의 공유 링크를 확인하지 못했어요. 먼저 공유 상태를 확인해 주세요.');}
  if(!link)return;
  if(typeof link.token!=='string')throw new Error('이 카드의 공유 링크를 확인하지 못했어요.');
  if(typeof link.expiresAt!=='number'||link.expiresAt>Date.now())await creditRequest('share-card',{action:'revoke',token:link.token});
  localStorage.removeItem(key);
}
