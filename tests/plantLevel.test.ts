import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPlantProgress, normalizePlantName } from '../src/lib/plantLevel.ts';

const records = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `식물 ${i + 1}` }));
test('levels retain the 10, 30, 60 and 100 collection milestones', () => {
  for (const [count, level, remaining] of [[0,1,10],[9,1,1],[10,2,20],[29,2,1],[30,3,30],[59,3,1],[60,4,40],[99,4,1],[100,5,0],[120,5,0]]) {
    const progress = getPlantProgress(records(count));
    assert.equal(progress.level, level); assert.equal(progress.remaining, remaining);
    assert.ok(progress.percent >= 0 && progress.percent <= 100);
  }
});
test('multiple photos of the same plant do not inflate collection level', () => {
  const archive = [{name:' 소나무 '},{name:'추정: 소나무'},{name:'소나무 (추정)'},{name:'장미'}, {name:'장 미'}, {name:'  '}];
  assert.equal(getPlantProgress(archive).count, 2);
  assert.equal(normalizePlantName('추정： 소나무'), '소나무');
  assert.equal(getPlantProgress(Array(30).fill({name:'은행나무'})).level, 1);
});
test('previous saved names count immediately and progress follows saved collection', () => {
  const saved = records(10);
  assert.equal(getPlantProgress(saved).level, 2);
  assert.equal(getPlantProgress(saved.slice(1)).level, 1);
  assert.equal(getPlantProgress(saved).percent, 0);
  assert.equal(getPlantProgress(records(20)).percent, 50);
});
