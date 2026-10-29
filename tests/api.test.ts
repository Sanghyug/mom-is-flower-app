import assert from 'node:assert/strict';
import { test } from 'node:test';
import analyze from '../api/analyze-flower.ts';
import story from '../api/flower-story.ts';
import type { Request, Response } from '../server/openai.ts';

function response() {
  const output = { status: 200, body: undefined as unknown, headers: {} as Record<string, string> };
  const res: Response = {
    setHeader(name, value) { output.headers[name] = value; },
    status(code) { output.status = code; return res; },
    json(value) { output.body = value; return value; }, end() { return undefined; },
  };
  return { output, res };
}
const image = 'data:image/jpeg;base64,ZmFrZQ==';
const complete = (value: unknown) => new globalThis.Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), { status: 200 });
const flower = { found: true, name: '코스모스', language: '순정', confidence: 'high', scientificName: 'Cosmos bipinnatus' };

test('preflight, unsupported methods and invalid images never call a paid provider', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Provider must not be called'); };
  try {
    for (const [req, status] of [[{ method: 'OPTIONS' }, 204], [{ method: 'GET' }, 405], [{ method: 'POST', body: { image: 'https://example.com/private' } }, 400], [{ method: 'POST', body: { image: 'data:text/html;base64,AAAA' } }, 400], [{ method: 'POST', body: { image: 'data:image/jpeg;base64,' + 'A'.repeat(4_000_001) } }, 400]] as [Request, number][]) {
      const { output, res } = response(); await analyze(req, res); assert.equal(output.status, status);
      assert.equal(output.headers['Cache-Control'], 'no-store');
    }
  } finally { globalThis.fetch = original; }
});
test('identification success and a non-flower result have distinct outcomes', async () => {
  const original = globalThis.fetch; process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  const originalModel = process.env.OPENAI_MODEL; process.env.OPENAI_MODEL = 'gpt-4o';
  try {
    globalThis.fetch = async (_url, init) => { const body = JSON.parse(String(init?.body)); assert.equal(body.model, 'gpt-4o'); assert.equal(body.messages[1].content[1].image_url.url, image); return complete(flower); };
    let result = response(); await analyze({ method: 'POST', body: { image } }, result.res);
    assert.equal(result.output.status, 200); assert.equal((result.output.body as typeof flower).name, '코스모스');
    globalThis.fetch = async () => complete({ found: false });
    result = response(); await analyze({ method: 'POST', body: { image } }, result.res); assert.deepEqual(result.output.body, { found: false });
  } finally { globalThis.fetch = original; delete process.env.OPENAI_API_KEY; if (originalModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = originalModel; }
});
test('provider errors and malformed JSON never expose internal data', async () => {
  const original = globalThis.fetch; process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  try {
    for (const mock of [async () => new globalThis.Response('private-provider-detail', { status: 500 }), async () => complete({ name: '' }), async () => new globalThis.Response('not json', { status: 200 })]) {
      globalThis.fetch = mock; const { output, res } = response(); await analyze({ method: 'POST', body: { image } }, res);
      assert.equal(output.status, 503); assert.ok(!JSON.stringify(output.body).includes('private-provider-detail')); assert.ok(!JSON.stringify(output.body).includes('test-only'));
    }
    globalThis.fetch = async () => new globalThis.Response('{}', { status: 429 });
    const { output, res } = response(); await analyze({ method: 'POST', body: { image } }, res); assert.equal(output.status, 429);
  } finally { globalThis.fetch = original; delete process.env.OPENAI_API_KEY; }
});
test('story requires a valid name and a complete response', async () => {
  const original = globalThis.fetch; process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  try {
    const invalid = response(); await story({ method: 'POST', body: { name: ' ' } }, invalid.res); assert.equal(invalid.output.status, 400);
    const full = { summary: '테스트 소개', habitat: '테스트 서식지', origin: '테스트 원산지', season: '테스트 시기', features: '테스트 특징', meaningOrigin: '테스트 꽃말', legend: '테스트 전설', art: '테스트 예술' };
    globalThis.fetch = async () => complete(full);
    const good = response(); await story({ method: 'POST', body: { name: '코스모스' } }, good.res); assert.equal(good.output.status, 200); assert.deepEqual(good.output.body, full);
    globalThis.fetch = async () => complete({ summary: 'partial' });
    const partial = response(); await story({ method: 'POST', body: { name: '코스모스' } }, partial.res); assert.equal(partial.output.status, 503);
  } finally { globalThis.fetch = original; delete process.env.OPENAI_API_KEY; }
});
