import { creditPolicy } from './creditPolicy';
import { creditRequest, demoCredits, earnDemo, loadWallet } from './creditClient';

// A daily share-sheet incentive, not proof of delivery to a KakaoTalk recipient.
// Copying a link and saving a file never pass through this function.
export async function withCardShareReward(share: () => Promise<unknown>, notify: (message: string) => void) {
  const prepared = (async () => {
    let ticket: string | undefined;
    let eligible = false;
    try {
    const wallet = await loadWallet();
    eligible = (wallet.cardShares ?? 0) < creditPolicy.cardShareDailyLimit;
    if (eligible && !demoCredits) {
      const started = await creditRequest('wallet', { action: 'startReward', kind: 'card' });
      if (typeof started.ticket === 'string') ticket = started.ticket;
    }
    } catch { /* Reward outages must not prevent sharing. */ }
    return { eligible, ticket };
  })();
  // Open immediately to retain Web Share user activation. Only settle after success.
  await share();
  const { eligible, ticket } = await prepared;
  if (eligible && demoCredits) {
    await earnDemo('card');
    window.dispatchEvent(new Event('plant-wallet-changed'));
    notify('공유창 이용 보상으로 체험 돋보기 1개를 받았어요.');
  } else if (ticket) {
    const receipt = { ticket, event: 'cardShareOpened' };
    try {
      localStorage.setItem('plant-credit-pending-reward', JSON.stringify(receipt));
      await creditRequest('wallet', { action: 'finishReward', ...receipt });
      localStorage.removeItem('plant-credit-pending-reward');
      window.dispatchEvent(new Event('plant-wallet-changed'));
      notify('공유창 이용 보상으로 돋보기 1개가 충전됐어요.');
    } catch {
      notify('공유창을 열었어요. 돋보기 보상은 다시 연결하면 확인할게요.');
    }
  } else {
    notify(eligible ? '공유창을 열었어요. 지금은 보상을 확인하지 못했어요.' : '공유창을 열었어요. 카드 공유 보상은 하루 3회 받을 수 있어요.');
  }
}
