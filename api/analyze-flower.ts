import { CreditError } from '../src/lib/creditPolicy.ts';
import { creditFailure, paidRecognition, verifiedUser } from '../server/credits.ts';
import { identifyPlant, validPlantImage } from '../server/identify.ts';
import { fail, prepare, type Request, type Response } from '../server/openai.ts';
export default async function handler(req: Request, res: Response) {
  if (!prepare(req, res)) return;
  const image = req.body?.image;
  if (!validPlantImage(image)) return res.status(400).json({ error: '올바른 식물 사진이 필요해요.' });
  try {
    const uid = await verifiedUser(req);
    return res.status(200).json(await paidRecognition(uid, req, image, () => identifyPlant(image)));
  } catch (error) { return error instanceof CreditError ? creditFailure(res, error) : fail(res, error); }
}
