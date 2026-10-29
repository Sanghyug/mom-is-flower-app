import { prepare, type Request, type Response } from '../server/openai.ts';
// Stories are bundled with identification. Never trigger a second AI request here.
export default async function handler(req: Request, res: Response) {
  if (!prepare(req, res)) return;
  return res.status(409).json({ code: 'STORY_INCLUDED_IN_IDENTIFICATION', error: '식물 이야기는 새 식물 찾기에 포함돼요. 별도 AI 호출이나 추가 차감은 하지 않아요.' });
}
