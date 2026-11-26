import type { Request, Response } from '../server/openai.ts';
// Existing invitation links continue to open the independent web app.
export default function handler(req: Request, res: Response) {
 res.setHeader('Cache-Control', 'no-store');
 if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(410).json({error:'친구 초대 보상은 종료되었어요.'});
 res.setHeader('Location', '/'); return res.status(302).end();
}
