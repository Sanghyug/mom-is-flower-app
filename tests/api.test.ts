import assert from 'node:assert/strict';
import { test } from 'node:test';
import analyze from '../api/analyze-flower.ts';
import story from '../api/flower-story.ts';
import { identifyPlant } from '../server/identify.ts';
import type { Request, Response } from '../server/openai.ts';
function response() {
  const out = { status: 200, body: undefined as unknown, headers: {} as Record<string,string> };
  const res: Response = { setHeader(k,v) {out.headers[k]=v;}, status(n){out.status=n;return res;}, json(v){out.body=v;}, end(){} };
  return {out,res};
}
const image='data:image/jpeg;base64,ZmFrZQ==';
const completion=(value:unknown)=>new globalThis.Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));
test('invalid requests and unauthenticated calls cannot reach paid AI',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 try {
  for(const [req,status] of [[{method:'OPTIONS'},204],[{method:'GET'},405],[{method:'POST',body:{image:'http://example.test'}},400],[{method:'POST',body:{image}},401]] as [Request,number][]){const {out,res}=response();await analyze(req,res);assert.equal(out.status,status);assert.equal(out.headers['Cache-Control'],'no-store');}
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('basic identification returns name and meaning without a separate story call',async()=>{
 const original=globalThis.fetch;const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fake-test-key';
 try {globalThis.fetch=async()=>completion({found:true,name:'코스모스',language:'순정',confidence:'high'});assert.equal((await identifyPlant(image)).name,'코스모스');globalThis.fetch=async()=>completion({found:false});assert.deepEqual(await identifyPlant(image),{found:false});}
 finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('malformed and failing AI responses are rejected for refund handling',async()=>{
 const original=globalThis.fetch;const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fake-test-key';
 try {for(const reply of [()=>new globalThis.Response('provider-private-data',{status:500}),()=>completion({name:''}),()=>new globalThis.Response('bad json')]){globalThis.fetch=async()=>reply();await assert.rejects(identifyPlant(image));}}
 finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('legacy story endpoint cannot trigger a second paid request',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 try {const {out,res}=response();await story({method:'POST',body:{name:'장미'}},res);assert.equal(out.status,409);assert.equal(calls,0);}
 finally{globalThis.fetch=original;}
});

test('one AI request returns the meaning origin and legends together', async () => {
 const original=globalThis.fetch; const key=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='fake-test-key'; let calls=0;
 try {
  globalThis.fetch=async()=>{ calls++; return completion({found:true,name:'수선화',language:'자기애',story:{summary:'수선화 소개',meaningOrigin:'그리스 전승과 연결되는 상징이에요.',legend:'그리스 신화의 나르키소스 이야기로 전해져요.'}}); };
  const result=await identifyPlant(image);
  assert.equal(calls,1);
  const details=result.story as Record<string,string>;
  assert.equal(details.legend,'그리스 신화의 나르키소스 이야기로 전해져요.');
  assert.equal(details.meaningOrigin,'그리스 전승과 연결되는 상징이에요.');
  assert.equal(details.art,'확인된 정보가 없어요.');
 } finally { globalThis.fetch=original; if(key===undefined)delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=key; }
});
