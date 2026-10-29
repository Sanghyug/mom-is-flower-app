// Local browser QA only. This server is never part of a Vercel deployment.
import { createServer } from 'node:http';
const story = Object.fromEntries(['summary','habitat','origin','season','features','meaningOrigin','legend','art'].map(key => [key, `브라우저 동작 확인용 ${key} 예시입니다. 실제 AI 분석 결과가 아닙니다.`]));
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  for await (const _ of req) { /* consume image payload without storing it */ }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/analyze-flower') res.end(JSON.stringify({ found: true, name: '코스모스 · 테스트', language: '동작 확인용 꽃말', confidence: 'medium' }));
  else if (req.url === '/api/flower-story') res.end(JSON.stringify(story));
  else res.writeHead(404).end('{}');
}).listen(8788, '127.0.0.1', () => console.log('Mock API ready at http://127.0.0.1:8788 (test data only)'));
