import type { Request, Response } from '../server/openai.ts';
export default function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const configured = process.env.TOSS_APP_SHARE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && !url.username && !url.password) { res.setHeader('Location', url.href); return res.status(302).end(); }
    } catch { /* Fall back to a user-initiated Toss deep link. */ }
  }
  const page = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>토스에서 엄마는꽃 만나기</title><style>body{margin:0;background:#faf9f5;color:#315c46;font:18px/1.8 system-ui,sans-serif}main{max-width:480px;margin:80px auto;padding:24px}a{display:block;background:#315c46;color:white;padding:16px;text-align:center;border-radius:14px;margin:20px 0}small{color:#687367}</style></head><body><main><h1>당신의 작은 식물도감,<br>엄마는꽃</h1><p>토스에서 꽃과 나무의 이름을 찾고 나만의 식물카드를 모아 보세요.</p><a href="intoss://mom-is-flower">토스에서 엄마는꽃 열기</a><small>토스 앱이 설치된 스마트폰에서 열어 주세요.</small><a href="/">웹에서 먼저 둘러보기</a></main></body></html>';
  return req.method === 'HEAD' ? res.status(200).end() : res.status(200).end(page);
}
