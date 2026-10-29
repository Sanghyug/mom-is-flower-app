import { prepare, type Request, type Response } from '../server/openai.ts';
// New story generation stays closed until the operator chooses a price. Previously saved stories remain readable.
export default async function handler(req: Request, res: Response) {
  if (!prepare(req, res)) return;
  return res.status(409).json({ code: 'STORY_PRICE_PENDING', error: '식물 이야기의 돋보기 사용 기준을 준비하고 있어요. 이름과 꽃말·메모 카드는 지금 이용할 수 있어요.' });
}
