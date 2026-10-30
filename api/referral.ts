import { CreditError } from '../src/lib/creditPolicy.ts';
import { creditFailure, services, verifiedUser, walletState } from '../server/credits.ts';
import { referralLink, renderReferralPage, validReferralCode } from '../server/referrals.ts';
import { publicOrigin } from '../server/sharePolicy.ts';
import { prepare, type Request, type Response } from '../server/openai.ts';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
    const code = req.query?.code;
    if (!validReferralCode(code)) return res.status(404).end('초대 링크를 확인해 주세요.');
    try {
      const entry = (await services().db.collection('plant_referral_codes').doc(code).get()).data();
      if (!entry) return res.status(404).end('초대 링크를 찾을 수 없어요.');
      const test = typeof req.query?.testDeploymentId === 'string' ? req.query.testDeploymentId : undefined;
      return req.method === 'HEAD' ? res.status(200).end() : res.status(200).end(renderReferralPage(code, publicOrigin(), test));
    } catch { return res.status(503).end('초대 링크에 잠시 연결하지 못했어요. 다시 시도해 주세요.'); }
  }
  if (!prepare(req, res)) return;
  try {
    const uid = await verifiedUser(req);
    await walletState(uid, req);
    const code = await referralLink(services().db, uid);
    return res.status(200).json({ url: `${publicOrigin()}/invite/${code}` });
  } catch (error) { return error instanceof CreditError ? creditFailure(res, error) : res.status(503).json({ error: '초대 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.' }); }
}
