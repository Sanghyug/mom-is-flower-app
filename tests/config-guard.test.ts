import assert from 'node:assert/strict';
import { test } from 'node:test';
import analyze from '../api/analyze-flower.ts';
import { plantLevels } from '../src/lib/plantLevel.ts';
import type { Response } from '../server/openai.ts';
test('missing server wallet configuration never falls back to a free AI call',async()=>{
 const original=globalThis.fetch;const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 let calls=0,status=200;globalThis.fetch=async()=>{calls++;throw Error('must not call provider');};
 const res:Response={setHeader(){},status(n){status=n;return res;},json(){},end(){}};
 try{await analyze({method:'POST',headers:{authorization:'Bearer fake'},body:{image:'data:image/jpeg;base64,ZmFrZQ==',balance:100000,requestId:'12345678-1234-1234-1234-123456789012'}},res);assert.equal(status,503);assert.equal(calls,0);}
 finally{globalThis.fetch=original;if(credentials===undefined)delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;else process.env.FIREBASE_SERVICE_ACCOUNT_JSON=credentials;}
});
test('the original published collection rank names are preserved verbatim',()=>{
 assert.deepEqual(plantLevels.map(item=>item.title),['들꽃 관심가','꽃길 산책가','들꽃 탐험가','꽃도감 수집가','들꽃 전문가']);
});
