import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newShareToken, tokenHash, validToken, shareSnapshot, shareIsActive, renderSharedCard, shareLifetime } from '../server/sharePolicy.ts';
import manage from '../api/share-card.ts';
import view from '../api/shared-card.ts';
import type {Response} from '../server/openai.ts';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD14AAAAASUVORK5CYII=';
const card={image,name:'장미',language:'사랑',memo:'함께 걸은 날',createdAt:'2026-10-30T00:00:00.000Z'};
function response(){let code=200;let body:unknown;const headers:Record<string,string>={};const res:Response={status(n){code=n;return res;},setHeader(k,v){headers[k]=v;},json(v){body=v;},end(v){body=v;}};return {res,result:()=>({code,body,headers})};}
test('public snapshot includes only the chosen card, never archive, uid or AI history',()=>{
 const snapshot=shareSnapshot({...card,uid:'private-user',story:{legend:'private history'},archive:['private']});
 assert.deepEqual(snapshot,card);
 assert.throws(()=>shareSnapshot({...card,image:'data:image/svg+xml;base64,PHN2Zz4='}));
 assert.throws(()=>shareSnapshot({...card,image:'data:image/png;base64,ZmFrZQ=='}));
 assert.throws(()=>shareSnapshot({...card,image:'data:image/png;base64,'+'A'.repeat(700000)}));
});
test('share tokens are random bearer secrets and revocation/expiry close access',()=>{
 const a=newShareToken(),b=newShareToken();assert.notEqual(a,b);assert.ok(validToken(a));assert.equal(tokenHash(a).length,64);assert.notEqual(tokenHash(a),a);
 assert.equal(validToken('../flower_cards'),false);assert.equal(validToken(['abc']),false);
 const now=Date.now();assert.equal(shareIsActive({expiresAt:now+shareLifetime},now),true);assert.equal(shareIsActive({expiresAt:now},now),false);assert.equal(shareIsActive({expiresAt:now+100,revoked:true},now),false);
});
test('recipient page exposes card image and OG preview without executing memo markup',()=>{
 const token=newShareToken();const page=renderSharedCard({...card,name:'<script>alert(1)</script>',memo:'<img src=x onerror=alert(1)>'},token,'https://mom-is-flower.vercel.app');
 assert.ok(page.includes('property="og:image"'));assert.ok(page.includes('/api/shared-card?token='));assert.ok(page.includes('식물카드 이미지 저장'));assert.ok(page.includes('noindex,nofollow,noarchive'));
 assert.ok(!page.includes('<script>'));assert.ok(!page.includes('<img src=x'));assert.ok(!page.includes('private-user'));
});
test('sharing fails closed before server configuration and rejects invalid public tokens',async()=>{
 const before=process.env.CARD_SHARING_ENABLED;delete process.env.CARD_SHARING_ENABLED;
 try {
  const m=response();await manage({method:'POST',body:{action:'create',card}},m.res);assert.equal(m.result().code,503);
  process.env.CARD_SHARING_ENABLED='true';const noAuth=response();await manage({method:'POST',body:{action:'create',card}},noAuth.res);assert.equal(noAuth.result().code,401);
  const bad=response();await view({method:'GET',query:{token:'bad'}},bad.res);assert.equal(bad.result().code,404);assert.equal(bad.result().headers['Cache-Control'],'private, no-store, max-age=0');
 }finally{if(before===undefined)delete process.env.CARD_SHARING_ENABLED;else process.env.CARD_SHARING_ENABLED=before;}
});
