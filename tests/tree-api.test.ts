import assert from 'node:assert/strict';
import { test } from 'node:test';
import analyze from '../api/analyze-flower.ts';
import type { Response } from '../server/openai.ts';

test('a tree without flowers is accepted as a plant identification', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'local-test-only';
  let prompt = '';
  let status = 200;
  let result: unknown;
  const res: Response = { setHeader() {}, status(value) { status = value; return res; }, json(value) { result = value; }, end() {} };
  try {
    globalThis.fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      prompt = request.messages[1].content[0].text;
      return new globalThis.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ found: true, name: '소나무', language: '절개와 장수', confidence: 'medium', scientificName: 'Pinus densiflora' }) } }] }));
    };
    await analyze({ method: 'POST', body: { image: 'data:image/jpeg;base64,ZmFrZQ==' } }, res);
    assert.equal(status, 200);
    assert.equal((result as {name:string}).name, '소나무');
    assert.ok(prompt.includes('꽃이 피지 않은 나무'));
    assert.ok(prompt.includes('꽃이 없다는 이유로 실패로 처리하지 마세요'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});
