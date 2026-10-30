import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rewardCompletionMatches,creditDay,currentWallet,grantCredit,initialWallet,reserveCredit,settleCredit,type Operation} from '../src/lib/creditPolicy.ts';
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
test('invite gives five, rewarded ad gives two, duplicate receipts give none',()=>{
 let wallet=grantCredit(initialWallet(),'share',false);assert.equal(wallet.balance,15);
 assert.equal(grantCredit(wallet,'share',true).balance,15);wallet=grantCredit(wallet,'ad',false);assert.equal(wallet.balance,17);
 wallet=grantCredit(grantCredit(wallet,'share',false),'share',false);
 assert.equal(wallet.balance,27);assert.throws(()=>grantCredit(wallet,'share',false),/REWARD_DAILY_LIMIT/);
});
test('daily limits cap paid attempts and ad rewards',()=>{
 assert.throws(()=>reserveCredit({...initialWallet(),searches:50},undefined,'photo'),/DAILY_LIMIT/);
 let wallet=initialWallet();for(let i=0;i<5;i++)wallet=grantCredit(wallet,'ad',false);assert.equal(wallet.balance,20);assert.throws(()=>grantCredit(wallet,'ad',false),/REWARD_DAILY_LIMIT/);
});
test('completed operations cannot later be refunded by a stale error handler',()=>{
 const reserved=reserveCredit(initialWallet(),undefined,'photo');const done=settleCredit(reserved.wallet,reserved.operation,{name:'은행나무'});
 assert.equal(settleCredit(done.wallet,done.operation,null).wallet.balance,9);
 const op:Operation={hash:'photo',status:'refunded'};assert.equal(settleCredit(initialWallet(),op,{name:'late'}).wallet.balance,10);
});

test('card rewards are independent, capped daily, and compatible with existing wallets',()=>{
 const old={balance:15,day:creditDay(),searches:0,shares:0,ads:1};
 const card=grantCredit(old,'card',false);
 assert.equal(card.balance,16);assert.equal(card.cardShares,1);
 assert.equal(grantCredit(card,'card',true).balance,16);
 const capped=grantCredit(grantCredit(card,'card',false),'card',false);
 assert.equal(capped.balance,18);assert.throws(()=>grantCredit(capped,'card',false),/REWARD_DAILY_LIMIT/);
 const invite=grantCredit(card,'share',false);assert.equal(invite.balance,21);
 const ad=grantCredit(invite,'ad',false);assert.equal(ad.balance,23);
 const tomorrow=currentWallet(ad,Date.now()+86400000);
 assert.equal(tomorrow.cardShares,0);assert.equal(tomorrow.balance,23);
 assert.equal(grantCredit(tomorrow,'card',false,Date.now()+86400000).balance,24);
});

test('dismissal, copy, and cross-kind completions cannot authorize rewards',()=>{
 for(const kind of ['ad','share','card']) {
   assert.equal(rewardCompletionMatches(kind,'dismissed'),false);
   assert.equal(rewardCompletionMatches(kind,'copy'),false);
 }
 assert.equal(rewardCompletionMatches('ad','cardShareOpened'),false);
 assert.equal(rewardCompletionMatches('share','cardShareOpened'),false);
 assert.equal(rewardCompletionMatches('card','sendViral'),false);
 assert.equal(rewardCompletionMatches('anything','userEarnedReward'),false);
 assert.equal(rewardCompletionMatches('ad','userEarnedReward'),true);
 assert.equal(rewardCompletionMatches('share','sendViral'),false);
 assert.equal(rewardCompletionMatches('card','cardShareOpened'),true);
});
