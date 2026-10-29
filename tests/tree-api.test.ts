import assert from 'node:assert/strict';
import {test} from 'node:test';
import {identifyPlant} from '../server/identify.ts';
test('flowerless trees are included in recognition',async()=>{
 const original=globalThis.fetch;const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fake-test-key';let prompt='';
 try{globalThis.fetch=async(_url,init)=>{prompt=JSON.parse(String(init?.body)).messages[1].content[0].text;return new globalThis.Response(JSON.stringify({choices:[{message:{content:JSON.stringify({found:true,name:'소나무',language:'절개',confidence:'medium'})}}]}));};assert.equal((await identifyPlant('data:image/jpeg;base64,ZmFrZQ==')).name,'소나무');assert.ok(prompt.includes('꽃이 피지 않은 나무'));}
 finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
