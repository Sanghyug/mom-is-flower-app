import { readCardShare } from '../server/cardShares.ts';
import { validToken, publicOrigin, renderSharedCard } from '../server/sharePolicy.ts';
import type { Request, Response } from '../server/openai.ts';
export default async function handler(req: Request,res: Response) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  const token=req.query?.token;
  if(!validToken(token))return res.status(404).end();
  try {
    const card=await readCardShare(token);
    if(!card){res.setHeader('Content-Type','text/plain; charset=utf-8');return res.status(404).end('만료되었거나 공유가 중단된 식물카드예요.');}
    if(req.query?.format==='image') {
      const png=card.image.startsWith('data:image/png;');
      res.setHeader('Content-Type',png?'image/png':'image/jpeg');
      if(req.query?.download==='1')res.setHeader('Content-Disposition',`attachment; filename="plant-card.${png?'png':'jpg'}"`);
      return req.method==='HEAD'?res.status(200).end():res.status(200).end(Buffer.from(card.image.split(',')[1],'base64'));
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return req.method==='HEAD'?res.status(200).end():res.status(200).end(renderSharedCard(card,token,publicOrigin()));
  }catch{return res.status(503).end('공유된 식물카드를 불러오지 못했어요. 잠시 후 다시 열어 주세요.');}
}
