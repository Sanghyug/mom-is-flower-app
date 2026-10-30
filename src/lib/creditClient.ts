import { entryReferralCode } from './referralEntry';
import { creditPolicy, grantCredit, initialWallet, type RewardKind, type Wallet } from './creditPolicy';

export type WalletState = Wallet & { rewards: { ad: boolean; share: boolean; card?: boolean }; adGroupId: string; shareModuleId: string };
export const demoCredits = import.meta.env.DEV && import.meta.env.VITE_WALLET_DEMO === 'true';
let authPromise: Promise<import('firebase/auth').Auth> | undefined;
async function authToken() {
  authPromise ??= (async () => {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth, signInAnonymously } = await import('firebase/auth');
    // Existing public Firebase project configuration. No photos are uploaded here.
    const app = getApps().find(item => item.name === 'plant-wallet') || initializeApp({
      apiKey: 'AIzaSyAjciDML9XEB8jZlC1kG6MGpxlXtHdeFKY', authDomain: 'mom-is-flower.firebaseapp.com',
      projectId: 'mom-is-flower', appId: '1:212958395926:web:4987d187e201c9de673f37',
    }, 'plant-wallet');
    const auth = getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    return auth;
  })().catch(error => { authPromise = undefined; throw error; });
  const auth = await authPromise;
  if (!auth.currentUser) throw new Error('돋보기 계정에 다시 연결해 주세요.');
  return auth.currentUser.getIdToken();
}
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export async function creditRequest(path: string, body: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
  if (demoCredits) throw new Error('체험 모드에서는 실제 API를 호출하지 않아요.');
  const referralCode = await entryReferralCode();
  const payload = body && typeof body === 'object' && !Array.isArray(body) ? { ...body, ...(referralCode ? { referralCode } : {}) } : body;
  let token: string;
  try { token = await authToken(); } catch { throw new Error('돋보기 계정에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 40000);
  try {
    const response = await fetch(`${apiBase}/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload), signal: controller.signal });
    const data: unknown = await response.json().catch(() => null);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('돋보기 서비스 연결을 준비하고 있어요.');
    const result = data as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '돋보기 요청을 완료하지 못했어요.');
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('응답 확인이 늦어지고 있어요. 같은 사진으로 다시 확인하면 중복 차감하지 않아요.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export function parseWallet(value: unknown): WalletState {
  const wallet = value as WalletState | null;
  if (!wallet || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0 || typeof wallet.day !== 'string' || !wallet.rewards) throw new Error('돋보기 잔액을 확인하지 못했어요.');
  return wallet;
}
type DemoLedger = { wallet: Wallet; results: Record<string, Record<string, unknown>> };
const demoKey = 'mom-flower-demo-wallet-v1';
function readDemo(): DemoLedger {
  const raw = localStorage.getItem(demoKey);
  if (raw) { try { const parsed = JSON.parse(raw) as DemoLedger; if (Number.isSafeInteger(parsed.wallet.balance) && parsed.wallet.balance >= 0 && parsed.results) return parsed; } catch { /* Only disposable demo data. */ } }
  return { wallet: initialWallet(), results: {} };
}
function writeDemo(ledger: DemoLedger) { localStorage.setItem(demoKey, JSON.stringify(ledger)); }
function demoState(wallet: Wallet): WalletState { return { ...wallet, rewards: { ad: true, share: true }, adGroupId: '', shareModuleId: '' }; }
export async function loadWallet(): Promise<WalletState> {
  if (demoCredits) { const ledger = readDemo(); writeDemo(ledger); return demoState(ledger.wallet); }
  const pending = localStorage.getItem('plant-credit-pending-reward');
  if (pending) {
    try {
      const receipt = JSON.parse(pending);
      if (typeof receipt.ticket === 'string' && typeof receipt.event === 'string') {
        const wallet = parseWallet(await creditRequest('wallet', { action: 'finishReward', ...receipt }));
        localStorage.removeItem('plant-credit-pending-reward'); return wallet;
      }
    } catch { /* Preserve the receipt for a later retry; balance reading can still proceed. */ }
  }
  return parseWallet(await creditRequest('wallet', { action: 'state' }));
}
export async function recognizeWithCredits(image: string, requestId: string, signal: AbortSignal) {
  if (demoCredits) {
    const ledger = readDemo();
    if (!ledger.results[requestId]) {
      if (ledger.wallet.balance < creditPolicy.identify) throw new Error('돋보기가 부족해요. 충전한 뒤 다시 찾아보세요.');
      ledger.wallet.balance -= creditPolicy.identify;
      ledger.results[requestId] = { found: true, name: '코스모스 · 화면 체험용', language: '실제 AI 분석이 아닌 모의 응답이에요', confidence: 'medium', story: { summary: '화면 체험용 예시예요. 실제 식물 분석 결과가 아닙니다.', habitat: '햇빛이 드는 곳에서 만나는 식물의 서식지를 안내해요.', origin: '식물 이름의 유래를 함께 알아봐요.', season: '꽃이 피는 계절을 안내해요.', features: '잎과 꽃의 특징을 정리해요.', meaningOrigin: '실제 분석에서는 알려진 꽃말의 유래를 정리하고, 불확실하면 확인되지 않았다고 알려드려요.', legend: '알려진 신화·설화·전설이 있을 때만 소개해요. 이 화면은 예시이므로 전설을 생성하지 않아요.', art: '문화 속 식물에 대한 이야기를 소개해요.' } };
      writeDemo(ledger);
    }
    return { ...ledger.results[requestId], wallet: demoState(ledger.wallet) };
  }
  return creditRequest('analyze-flower', { image, requestId }, signal);
}
export async function earnDemo(kind: RewardKind) {
  const ledger = readDemo(); ledger.wallet = grantCredit(ledger.wallet, kind, false); writeDemo(ledger);
  return demoState(ledger.wallet);
}
export function resetDemoWallet() {
  if (!demoCredits) throw new Error('실제 돋보기는 초기화할 수 없어요.');
  const wallet = initialWallet(); writeDemo({ wallet, results: {} }); return demoState(wallet);
}
