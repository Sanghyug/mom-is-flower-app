import { verifiedUser } from '../server/credits.ts';
import { createCardShare, revokeCardShare, requireCardSharing } from '../server/cardShares.ts';
import { ShareError, publicOrigin } from '../server/sharePolicy.ts';
import { CreditError } from '../src/lib/creditPolicy.ts';
import { prepare, type Request, type Response } from '../server/openai.ts';
export default async function handler(req: Request,res: Response) {
  if(!prepare(req,res))return;
  try {
    requireCardSharing();
    const uid=await verifiedUser(req);
    if(req.body?.action==='create') {
      const origin=publicOrigin();
      const result=await createCardShare(uid,req.body.card);
      return res.status(200).json({...result,url:`${origin}/s/${result.token}`});
    }
    if(req.body?.action==='revoke') {await revokeCardShare(uid,req.body.token);return res.status(200).json({revoked:true});}
    throw new ShareError('올바른 공유 요청이 필요해요.');
  } catch(error) {
    if(error instanceof ShareError)return res.status(error.status).json({error:error.message});
    return res.status(error instanceof CreditError ? error.status : 503).json({error:'카드 공유에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'});
  }
}
