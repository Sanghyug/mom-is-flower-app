import { CreditError } from '../src/lib/creditPolicy.ts';
import { creditFailure, verifiedUser, walletState } from '../server/credits.ts';
import { prepare, type Request, type Response } from '../server/openai.ts';
export default async function handler(req: Request, res: Response) {
  if (!prepare(req, res)) return;
  try {
    const uid = await verifiedUser(req);
    const action = req.body?.action;
    if (action === 'state') return res.status(200).json(await walletState(uid, req));
    if (action === 'startReward' || action === 'finishReward') return res.status(410).json({ error: '광고·공유 보상은 종료되었어요.' });
    return res.status(400).json({ error: '올바른 무료 분석 요청이 필요해요.' });
  } catch (error) {
    if (!(error instanceof CreditError)) {
      const message = error instanceof Error ? error.message : 'unknown backend error';
      console.error('wallet_backend_error', message.replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted-token]').replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-key]').slice(0, 700));
    }
    return creditFailure(res, error instanceof CreditError ? error : new CreditError('CREDITS_UNAVAILABLE', 503)); }
}
