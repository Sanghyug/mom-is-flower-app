import { adGroups } from './adGroups';
import type { RewardKind } from './creditPolicy';
import type { WalletState } from './creditClient';

export async function runReward(kind: RewardKind, wallet: WalletState, signal: AbortSignal): Promise<string> {
  const sdk = await import('@apps-in-toss/web-framework');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (kind === 'ad' && (!sdk.loadFullScreenAd.isSupported() || !sdk.showFullScreenAd.isSupported())) throw new Error('이 환경에서는 보상형 광고를 사용할 수 없어요. 토스 앱에서 확인해 주세요.');
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanups: (() => void)[] = [];
    const finish = (event?: string, error?: unknown) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
      cleanups.forEach(cleanup => cleanup());
      if (error) reject(error); else resolve(event!);
    };
    const register = (cleanup: () => void) => { if (settled) cleanup(); else cleanups.push(cleanup); };
    const abort = () => finish(undefined, new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(undefined, new Error('보상을 확인하지 못했어요. 다시 시도해 주세요.')), 180000);
    signal.addEventListener('abort', abort, { once: true });
    if (kind === 'share') {
      register(sdk.contactsViral({ options: { moduleId: wallet.shareModuleId },
        onEvent: event => { if (event.type === 'sendViral') finish('sendViral'); else if (event.type === 'close') finish(undefined, new DOMException('Cancelled', 'AbortError')); },
        onError: () => finish(undefined, new Error('공유를 완료하지 못했어요. 돋보기는 지급되지 않았어요.')),
      }));
      return;
    }
    let showing = false;
    register(sdk.loadFullScreenAd({ options: { adGroupId: wallet.adGroupId || adGroups.rewarded }, onEvent: event => {
      if (event.type !== 'loaded' || showing || settled) return;
      showing = true;
      register(sdk.showFullScreenAd({ options: { adGroupId: wallet.adGroupId || adGroups.rewarded }, onEvent: shown => {
        if (shown.type === 'userEarnedReward') finish('userEarnedReward');
        else if (shown.type === 'dismissed') finish(undefined, new DOMException('Cancelled', 'AbortError'));
        else if (shown.type === 'failedToShow') finish(undefined, new Error('광고를 표시하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      }, onError: () => finish(undefined, new Error('광고 재생을 완료하지 못했어요.')) }));
    }, onError: () => finish(undefined, new Error('지금은 준비된 광고가 없어요. 잠시 후 다시 확인해 주세요.')) }));
  });
}
