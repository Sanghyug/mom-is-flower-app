import assert from 'node:assert/strict';
import {test} from 'node:test';
import {creditDay,currentWallet,grantCredit,initialWallet,reserveCredit,settleCredit,type Operation} from '../src/lib/creditPolicy.ts';
test('welcome grants ten once, daily reset never refills the balance',()=>{
 const now=Date.parse('2026-10-29T14:59:00Z');const wallet=initialWallet(now);assert.equal(wallet.balance,10);
 assert.equal(currentWallet({...wallet,balance:4,ads:3},now+120000).balance,4);assert.equal(currentWallet({...wallet,balance:4,ads:3},now+120000).ads,0);
 assert.equal(creditDay(now),'2026-10-29');assert.equal(creditDay(now+120000),'2026-10-30');
});
test('identification reserves exactly one and prevents negative balances',()=>{
 const first=reserveCredit(initialWallet(),undefined,'photo');assert.equal(first.wallet.balance,9);
 assert.throws(()=>reserveCredit({...initialWallet(),balance:0},undefined,'photo'),/NO_CREDITS/);
 assert.throws(()=>reserveCredit(first.wallet,first.operation,'photo'),/REQUEST_PENDING/);
});
test('same completed request returns its result and charges nothing twice',()=>{
 const reserved=reserveCredit(initialWallet(),undefined,'photo');const done=settleCredit(reserved.wallet,reserved.operation,{name:'장미'});
 const repeated=reserveCredit(done.wallet,done.operation,'photo');assert.equal(repeated.wallet.balance,9);assert.deepEqual(repeated.cached,{name:'장미'});
 assert.throws(()=>reserveCredit(done.wallet,done.operation,'different-photo'),/REQUEST_CHANGED/);
});
test('failure refunds only once and permits a controlled retry',()=>{
 const reserved=reserveCredit(initialWallet(),undefined,'photo');const refund=settleCredit(reserved.wallet,reserved.operation,null);assert.equal(refund.wallet.balance,10);
 assert.equal(settleCredit(refund.wallet,refund.operation,null).wallet.balance,10);
 assert.equal(reserveCredit(refund.wallet,refund.operation,'photo').wallet.balance,9);
});
test('share gives two, rewarded ad gives five, duplicate receipts give none',()=>{
 let wallet=grantCredit(initialWallet(),'share',false);assert.equal(wallet.balance,12);
 assert.equal(grantCredit(wallet,'share',true).balance,12);wallet=grantCredit(wallet,'ad',false);assert.equal(wallet.balance,17);
 assert.throws(()=>grantCredit(wallet,'share',false),/REWARD_DAILY_LIMIT/);
});
test('daily limits cap paid attempts and ad rewards',()=>{
 assert.throws(()=>reserveCredit({...initialWallet(),searches:50},undefined,'photo'),/DAILY_LIMIT/);
 let wallet=initialWallet();for(let i=0;i<5;i++)wallet=grantCredit(wallet,'ad',false);assert.equal(wallet.balance,35);assert.throws(()=>grantCredit(wallet,'ad',false),/REWARD_DAILY_LIMIT/);
});
test('completed operations cannot later be refunded by a stale error handler',()=>{
 const reserved=reserveCredit(initialWallet(),undefined,'photo');const done=settleCredit(reserved.wallet,reserved.operation,{name:'은행나무'});
 assert.equal(settleCredit(done.wallet,done.operation,null).wallet.balance,9);
 const op:Operation={hash:'photo',status:'refunded'};assert.equal(settleCredit(initialWallet(),op,{name:'late'}).wallet.balance,10);
});
