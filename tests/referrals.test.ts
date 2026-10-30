import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { connectWallet } from '../server/walletRegistration.ts';
import { qualifyReferral, referralLink, renderReferralPage } from '../server/referrals.ts';
import { initialWallet } from '../src/lib/creditPolicy.ts';
import { referralFromURL } from '../src/lib/referralEntry.ts';

function fixture() {
  const rows = new Map<string, Record<string, unknown>>();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ({ key: `${name}/${id}` }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: {key: string}) => { assert.equal(writes.length,0,'Firestore reads must precede writes'); return { exists: rows.has(ref.key), data: () => rows.get(ref.key) }; },
        set: (ref: {key: string}, data: Record<string, unknown>) => writes.push(() => rows.set(ref.key, structuredClone(data))),
        create: (ref: {key: string}, data: Record<string, unknown>) => writes.push(() => { assert.equal(rows.has(ref.key),false); rows.set(ref.key,structuredClone(data)); }),
      };
      const result = await fn(tx); writes.forEach(write => write()); return result;
    },
  } as unknown as Firestore;
  const settle = (uid: string, id: string, now?: number) => db.runTransaction(tx => qualifyReferral(tx, db, uid, id, now));
  return { rows, db, settle };
}

test('referral attaches only at first account connection and never exposes inviter identity in wallet', async () => {
  const {db,rows} = fixture();
  await connectWallet(db,'inviter','bucket');
  const code = await referralLink(db,'inviter');
  assert.equal(code.length,24);assert.equal(await referralLink(db,'inviter'),code);
  const friend = await connectWallet(db,'friend','bucket',code);
  assert.equal(friend.balance,10);assert.equal('inviterUid' in friend,false);
  assert.equal(rows.get('plant_referral_members/friend')?.inviterUid,'inviter');
  await connectWallet(db,'existing','bucket');
  await connectWallet(db,'existing','bucket',code);
  assert.equal(rows.get('plant_referral_members/existing')?.inviterUid,undefined);
  const otherCode = await referralLink(db,'friend');
  await connectWallet(db,'friend','bucket',otherCode);
  assert.equal(rows.get('plant_referral_members/friend')?.inviterUid,'inviter');
});

test('only successful first plant settlement gives inviter five, once per new account',async()=>{
 const {db,rows,settle}=fixture();
 await connectWallet(db,'inviter','bucket');const code=await referralLink(db,'inviter');
 await connectWallet(db,'friend','bucket',code);
 // Sharing/landing/registration has no award.
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,10);
 await settle('friend','first-success');
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,15);
 assert.equal(rows.get('plant_referral_members/friend')?.rewardStatus,'granted');
 await settle('friend','same-request');await settle('friend','another-photo');
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,15);
 await settle('existing-account-without-membership','first-success');
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,15);
});

test('three successful invitees per KST day, no over-limit rollover, balances remain intact',async()=>{
 const {db,rows,settle}=fixture();const now=Date.parse('2026-10-30T10:00:00Z');
 rows.set('plant_credit_wallets/inviter',initialWallet(now));const code=await referralLink(db,'inviter');
 for(let i=0;i<4;i++){await connectWallet(db,`friend${i}`,'bucket',code,now);await settle(`friend${i}`,`success${i}`,now);}
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,25);
 assert.equal(rows.get('plant_credit_wallets/inviter')?.shares,3);
 assert.equal(rows.get('plant_referral_members/friend3')?.rewardStatus,'daily_limit');
 await settle('friend3','retry-tomorrow',now+86400000);
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,25);
 await connectWallet(db,'tomorrow','bucket',code,now+86400000);await settle('tomorrow','first',now+86400000);
 assert.equal(rows.get('plant_credit_wallets/inviter')?.balance,30);
 assert.equal(rows.get('plant_credit_wallets/inviter')?.shares,1);
});

test('self-referral is excluded both at registration and settlement',async()=>{
 const {db,rows,settle}=fixture();const code='a'.repeat(24);
 rows.set(`plant_referral_codes/${code}`,{uid:'self'});
 await connectWallet(db,'self','bucket',code);
 assert.equal(rows.get('plant_referral_members/self')?.inviterUid,undefined);
 rows.set('plant_referral_members/self',{inviterUid:'self'});
 await settle('self','success');assert.equal(rows.get('plant_credit_wallets/self')?.balance,10);
});

test('invitation entry survives web and private Toss schemes without leaking uid or accepting markup',()=>{
 const code='a'.repeat(24);
 assert.equal(referralFromURL(`https://mom-is-flower.vercel.app/?ref=${code}`),code);
 assert.equal(referralFromURL(`intoss-private://mom-is-flower?_deploymentId=abc&ref=${code}`),code);
 assert.equal(referralFromURL('https://example.com/?ref=<script>'),null);
 const page=renderReferralPage(code,'https://mom-is-flower.vercel.app','01a18a32-3224-77b1-bc38-340a3f1dda8c');
 assert.ok(page.includes(`/?ref=${code}`));assert.ok(page.includes('intoss-private://mom-is-flower?'));
 assert.ok(page.includes('새 계정'));assert.ok(!page.includes('inviterUid'));
});
