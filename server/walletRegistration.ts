import type { Firestore } from 'firebase-admin/firestore';
import { CreditError, creditDay, currentWallet, initialWallet, type Wallet } from '../src/lib/creditPolicy.ts';
import { validReferralCode } from './referrals.ts';

export async function connectWallet(db: Firestore, uid: string, bucket: string, referralCode?: unknown, now = Date.now()): Promise<Wallet> {
  const ref = db.collection('plant_credit_wallets').doc(uid);
  const welcome = db.collection('plant_credit_signup_limits').doc(`${creditDay(now)}_${bucket}`);
  const referralRef = validReferralCode(referralCode) ? db.collection('plant_referral_codes').doc(referralCode) : null;
  return db.runTransaction(async tx => {
    const [existing, counter, referral] = await Promise.all([tx.get(ref), tx.get(welcome), referralRef ? tx.get(referralRef) : null]);
    // Referral attribution is immutable after the first wallet connection.
    if (existing.exists) return currentWallet(existing.data() as Wallet, now);
    const count = Number(counter.data()?.count || 0);
    if (count >= 20) throw new CreditError('SIGNUP_LIMIT', 429);
    const wallet = initialWallet(now);
    const inviterUid = referral?.data()?.uid;
    tx.set(db.collection('plant_referral_members').doc(uid), {
      joinedAt: now, ...(typeof inviterUid === 'string' && inviterUid !== uid ? { inviterUid } : {}),
    });
    tx.set(ref, wallet);
    tx.set(welcome, { count: count + 1, expiresAt: new Date(now + 3 * 86400000) });
    return wallet;
  });
}
