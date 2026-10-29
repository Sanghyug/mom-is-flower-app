import { createHash, randomBytes } from 'node:crypto';
export const shareLifetime = 30 * 86400000;
export type ShareSnapshot = { image: string; name: string; language: string; memo: string; createdAt: string };
export class ShareError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function validToken(token: unknown): token is string { return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token); }
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const newShareToken = () => randomBytes(32).toString('base64url');
export function shareSnapshot(value: unknown): ShareSnapshot {
  const card = value as Record<string, unknown> | null;
  if (!card || typeof card.image !== 'string' || card.image.length > 700000 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(card.image)) throw new ShareError('공유할 카드 이미지를 확인해 주세요. 이미지가 크면 파일로 저장해 보내 주세요.');
  const bytes = Buffer.from(card.image.split(',')[1], 'base64');
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (card.image.startsWith('data:image/png;') ? !png : !jpeg) throw new ShareError('JPG 또는 PNG 카드가 필요해요.');
  if (typeof card.name !== 'string' || !card.name.trim() || typeof card.language !== 'string' || typeof card.createdAt !== 'string' || !Number.isFinite(Date.parse(card.createdAt))) throw new ShareError('카드의 이름과 생성 날짜를 확인해 주세요.');
  return { image: card.image, name: card.name.slice(0,100), language: card.language.slice(0,300), memo: typeof card.memo === 'string' ? card.memo.slice(0,40) : '', createdAt: new Date(card.createdAt).toISOString() };
}
export function shareIsActive(data: { revoked?: boolean; expiresAt?: number } | undefined, now = Date.now()) { return !!data && !data.revoked && typeof data.expiresAt === 'number' && data.expiresAt > now; }
export function publicOrigin() {
  const url = new URL(process.env.PUBLIC_APP_ORIGIN || 'https://mom-is-flower.vercel.app');
  if (url.protocol !== 'https:' || url.username || url.password) throw new ShareError('공유 서비스 주소 설정이 필요해요.',503);
  return url.origin;
}
export const html = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function renderSharedCard(card: ShareSnapshot, token: string, origin: string) {
  const title=html(`${card.name} · 엄마는꽃`);
  const image=`${origin}/api/shared-card?token=${encodeURIComponent(token)}&format=image`;
  const date = html(new Date(card.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${title}</title><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${html(card.language)}"><meta property="og:image" content="${html(image)}"><meta property="og:url" content="${html(`${origin}/s/${token}`)}"><style>body{margin:0;background:#f6f5ed;color:#274d3e;font:18px/1.7 system-ui,sans-serif}main{max-width:560px;margin:32px auto;padding:20px}img{display:block;width:100%;height:auto;border-radius:8px}h1{font-size:26px}p{overflow-wrap:anywhere;white-space:pre-wrap}a{display:block;padding:14px;background:#315c46;color:white;text-align:center;border-radius:12px;margin-top:16px}small{color:#637061}</style></head><body><main><h1>${title}</h1><img src="${html(image)}" alt="${title} 식물카드"><p>${html(card.language)}</p>${card.memo ? `<p>“${html(card.memo)}”</p>` : ''}<small>만난 날 · ${date}<br>사용자가 공유한 카드예요. 링크는 만료되거나 공유가 중단될 수 있어요.</small><a href="${html(image)}&download=1" download="plant-card.jpg">식물카드 이미지 저장</a><a href="${html(origin)}/toss">토스에서 엄마는꽃 열기</a><a href="${html(origin)}">웹에서 식물도감 둘러보기</a></main></body></html>`;
}
