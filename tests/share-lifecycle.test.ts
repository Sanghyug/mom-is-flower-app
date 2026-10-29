import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCardShare, readCardShare, revokeCardShare} from '../server/cardShares.ts';
import {tokenHash} from '../server/sharePolicy.ts';
import type {Firestore} from 'firebase-admin/firestore';
test('share creation, owner-only revocation, expiry and daily quota use only snapshot collections',async()=>{
 const original=process.env.CARD_SHARING_ENABLED;process.env.CARD_SHARING_ENABLED='true';
 const rows=new Map<string,Record<string,unknown>>();
 const ref=(key:string)=>({key,get:async()=>({data:()=>rows.get(key)})});
 const fake={collection:(name:string)=>({doc:(id:string)=>ref(`${name}/${id}`)}),runTransaction:async(fn:(tx:unknown)=>Promise<unknown>)=>{
  const writes:Array<()=>void>=[];
  const tx={get:async(r:{key:string})=>({data:()=>rows.get(r.key)}),create:(r:{key:string},value:Record<string,unknown>)=>writes.push(()=>{assert.equal(rows.has(r.key),false);rows.set(r.key,value);}),set:(r:{key:string},value:Record<string,unknown>)=>writes.push(()=>rows.set(r.key,value))};
  const result=await fn(tx);writes.forEach(write=>write());return result;
 }} as unknown as Firestore;
 const card={name:'코스모스',language:'순정',memo:'산책길',createdAt:'2026-10-30T00:00:00.000Z',image:'data:image/jpeg;base64,/9j/AA=='};
 try {
  const created=await createCardShare('owner',card,fake);
  assert.deepEqual(await readCardShare(created.token,fake),card);
  await assert.rejects(revokeCardShare('someone-else',created.token,fake),/권한/);
  assert.deepEqual(await readCardShare(created.token,fake),card);
  await revokeCardShare('owner',created.token,fake);assert.equal(await readCardShare(created.token,fake),null);
  assert.equal(rows.get(`plant_shared_cards/${tokenHash(created.token)}`)?.card,undefined);
  const expiring=await createCardShare('owner',card,fake);rows.get(`plant_shared_cards/${tokenHash(expiring.token)}`)!.expiresAt=Date.now()-1;
  assert.equal(await readCardShare(expiring.token,fake),null);
  for(let i=0;i<18;i++)await createCardShare('owner',card,fake);
  await assert.rejects(createCardShare('owner',card,fake),/오늘은/);
  assert.ok([...rows.keys()].every(key=>!key.startsWith('flower_cards/')));
 }finally{if(original===undefined)delete process.env.CARD_SHARING_ENABLED;else process.env.CARD_SHARING_ENABLED=original;}
});
