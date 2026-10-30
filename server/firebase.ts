import { cert, getApps, initializeApp, type Credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { ExternalAccountClient, GoogleAuth } from 'google-auth-library';
import { getVercelOidcToken } from '@vercel/oidc';
import { CreditError } from '../src/lib/creditPolicy.ts';
let cached: { auth: ReturnType<typeof getAuth>; db: Firestore } | undefined;
export function getFirebaseServices() {
  if (cached) return cached;
  const secret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'mom-is-flower';
  const existing = getApps().find(app => app.name === 'flower-credits');
  if (secret) {
    const app = existing || initializeApp({ projectId, credential: cert(JSON.parse(secret)) }, 'flower-credits');
    return cached = { auth: getAuth(app), db: getFirestore(app) };
  }
  const audience = process.env.FIREBASE_WIF_AUDIENCE;
  const serviceAccount = process.env.FIREBASE_WIF_SERVICE_ACCOUNT;
  if (!audience || !serviceAccount) throw new CreditError('CREDITS_NOT_CONFIGURED', 503);
  const client = ExternalAccountClient.fromJSON({
    type: 'external_account', audience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: async () => getVercelOidcToken() },
  });
  if (!client) throw new CreditError('CREDITS_NOT_CONFIGURED', 503);
  const credential: Credential = {
    async getAccessToken() {
      const result = await client.getAccessToken();
      if (!result.token) throw new CreditError('CREDITS_UNAVAILABLE', 503);
      return { access_token: result.token, expires_in: Math.max(1, Math.floor(((client.credentials.expiry_date || Date.now() + 300000) - Date.now()) / 1000)) };
    },
  };
  const app = existing || initializeApp({ projectId, credential }, 'flower-credits');
  // Firestore's REST transport accepts the GoogleAuth instance with its external account client.
  // No long-lived service-account key is created or stored on Vercel.
  const db = new Firestore({ projectId, auth: new GoogleAuth({ authClient: client }), preferRest: true });
  return cached = { auth: getAuth(app), db };
}