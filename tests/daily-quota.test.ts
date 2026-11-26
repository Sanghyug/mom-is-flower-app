import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyWallet, reserveDaily, settleDaily } from '../src/lib/dailyQuota.ts';
import { rewardAvailability } from '../server/credits.ts';
import { adSenseConfig } from '../src/lib/ads.ts';
const now = Date.parse('2026-11-27T14:59:00Z');
test('five daily analyses, server ignores a forged balance, KST midnight resets without rollover', () => {
  let wallet = dailyWallet(undefined, now);
  assert.equal(wallet.balance, 5);
  for (let i = 0; i < 5; i++) wallet = reserveDaily({ ...wallet, balance: 10000 }, undefined, `image-${i}`, now).wallet;
  assert.equal(wallet.balance, 0);
  assert.throws(() => reserveDaily(wallet, undefined, 'six', now), /DAILY_LIMIT/);
  assert.equal(dailyWallet(wallet, now + 60000).balance, 5);
});
test('same request caches once, changed images and pending requests are rejected', () => {
  const reserved = reserveDaily(dailyWallet(undefined, now), undefined, 'photo', now);
  assert.throws(() => reserveDaily(reserved.wallet, reserved.operation, 'photo', now), /REQUEST_PENDING/);
  assert.throws(() => reserveDaily(reserved.wallet, reserved.operation, 'different', now), /REQUEST_CHANGED/);
  const done = settleDaily(reserved.wallet, reserved.operation, { name: '꽃' }, now);
  const cached = reserveDaily(done.wallet, done.operation, 'photo', now);
  assert.equal(cached.wallet.balance, 4); assert.deepEqual(cached.cached, { name: '꽃' });
  assert.equal(settleDaily(done.wallet, done.operation, null, now).wallet.balance, 4);
});
test('failed and stale operations refund once, and yesterday cannot refund today', () => {
  const reserved = reserveDaily(dailyWallet(undefined, now), undefined, 'photo', now);
  const refund = settleDaily(reserved.wallet, reserved.operation, null, now);
  assert.equal(refund.wallet.balance, 5);
  assert.equal(settleDaily(refund.wallet, refund.operation, null, now).wallet.balance, 5);
  const tomorrow = reserveDaily(dailyWallet(reserved.wallet, now + 60000), undefined, 'new', now + 60000);
  assert.equal(settleDaily(tomorrow.wallet, reserved.operation, null, now + 60000).wallet.balance, 4);
  assert.equal(reserveDaily(refund.wallet, refund.operation, 'photo', now).wallet.balance, 4);
});
test('all legacy rewards are disabled and AdSense requires a separate valid opt-in', () => {
  assert.deepEqual(rewardAvailability(), { ad: false, share: false, card: false });
  const ids = { VITE_ADSENSE_CLIENT: 'ca-pub-1234567890123456', VITE_ADSENSE_SLOT: '1234567890' };
  assert.equal(adSenseConfig(ids).enabled, false);
  assert.equal(adSenseConfig({ ...ids, VITE_ADSENSE_ENABLED: 'true' }).enabled, true);
  assert.equal(adSenseConfig({ ...ids, VITE_ADSENSE_ENABLED: 'true', VITE_ADSENSE_SLOT: '' }).enabled, false);
  assert.equal(adSenseConfig({ VITE_ADSENSE_CLIENT: '<script>' }).publisherValid, false);
});
