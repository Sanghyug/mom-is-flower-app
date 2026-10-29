import { useEffect, useRef, useState } from 'react';
import { Search, Share2, Play, Plus } from 'lucide-react';
import Dialog from './Dialog';
import { creditPolicy, type RewardKind } from '../lib/creditPolicy';
import { creditRequest, demoCredits, earnDemo, parseWallet, resetDemoWallet, type WalletState } from '../lib/creditClient';
import { runReward } from '../lib/rewardSdk';
import { isToss } from '../lib/photos';

export default function CreditWallet({ wallet, error, open, onOpenChange, onRefresh, onChange, notify }: {
  wallet: WalletState | null; error: string; open: boolean; onOpenChange: (open: boolean) => void; onRefresh: () => Promise<void>; onChange: (wallet: WalletState) => void; notify: (message: string) => void;
}) {
  const setOpen = onOpenChange;
  const [working, setWorking] = useState(false);
  const [rewardError, setRewardError] = useState('');
  const [demoReward, setDemoReward] = useState<RewardKind | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function earn(kind: RewardKind) {
    if (!wallet || working) return;
    if (demoCredits) { setDemoReward(kind); return; }
    setWorking(true); setRewardError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const started = await creditRequest('wallet', { action: 'startReward', kind });
      const event = await runReward(kind, wallet, abort.signal);
      // Keep the server-issued ticket on the device until the grant is acknowledged.
      const receipt = { ticket: started.ticket, event };
      localStorage.setItem('plant-credit-pending-reward', JSON.stringify(receipt));
      const next = parseWallet(await creditRequest('wallet', { action: 'finishReward', ...receipt }));
      localStorage.removeItem('plant-credit-pending-reward'); onChange(next);
      notify(`돋보기 ${kind === 'share' ? creditPolicy.shareReward : creditPolicy.adReward}개가 충전됐어요.`);
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setRewardError(e instanceof Error ? e.message : '보상을 확인하지 못했어요.'); }
    finally { setWorking(false); }
  }
  async function confirmDemo() {
    if (!demoReward) return;
    try { onChange(await earnDemo(demoReward)); setDemoReward(null); notify('체험용 돋보기를 충전했어요. 실제 광고·공유는 실행하지 않았어요.'); }
    catch (e) { setRewardError(e instanceof Error ? e.message : '체험 보상 한도에 도달했어요.'); setDemoReward(null); }
  }
  return <>
    <div className="credit-strip"><span><Search size={20} />돋보기 <strong>{wallet ? `${wallet.balance}개` : error ? '연결 필요' : '연결 중'}</strong></span><button onClick={() => setOpen(true)}><Plus size={17} />충전하기</button></div>
    {demoCredits && <p className="credit-demo-banner">화면 체험 모드 · 실제 AI 호출·광고·공유 없이 돋보기 흐름만 확인해요.</p>}
    {open && <Dialog title="나의 돋보기" onClose={() => { controller.current?.abort(); setOpen(false); setWorking(false); setDemoReward(null); }}>
      <div className="credit-balance"><Search size={35} strokeWidth={1.5} /><strong>{wallet?.balance ?? '—'}<small>개</small></strong><p>처음 연결하면 돋보기 10개를 드려요.</p></div>
      <div className="credit-usage"><strong>식물 이름 찾기 · 돋보기 1개</strong><p>이름·꽃말·유래와 신화·설화를 함께 알려드려요.<br />메모 작성과 카드 저장은 추가 소모가 없어요.</p></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!wallet && <button className="button button-secondary" onClick={() => void onRefresh()}>돋보기 다시 연결하기</button>}
      <button className="button button-primary" disabled={!wallet || working || (!demoCredits && (!isToss || !wallet.rewards.ad)) || (wallet?.ads ?? 0) >= creditPolicy.adDailyLimit} onClick={() => void earn('ad')}><Play size={21} />{working ? '보상을 확인하고 있어요' : demoCredits ? '광고 보상 체험 · +5개' : '광고 보고 돋보기 5개 받기'}</button>
      <button className="button button-secondary" disabled={!wallet || working || (!demoCredits && (!isToss || !wallet.rewards.share)) || (wallet?.shares ?? 0) >= creditPolicy.shareDailyLimit} onClick={() => void earn('share')}><Share2 size={21} />{demoCredits ? '공유 보상 체험 · +2개' : '친구에게 공유하고 2개 받기'}</button>
      <p className="storage-note">광고는 보상 완료, 공유는 토스 공유 완료가 확인된 경우에만 지급해요. 닫기·취소·주소 복사는 보상에 포함되지 않아요.<br />하루 광고 {creditPolicy.adDailyLimit}회 · 공유 {creditPolicy.shareDailyLimit}회까지 받을 수 있어요.</p>
      {!demoCredits && (!wallet?.rewards.ad || !wallet?.rewards.share) && <p className="storage-note">광고·공유 보상은 토스 연결을 준비 중이에요.</p>}
      {rewardError && <p className="inline-error" role="alert">{rewardError}</p>}
      {demoCredits && <button className="button button-text" disabled={working} onClick={() => { onChange(resetDemoWallet()); setDemoReward(null); setRewardError(''); }}>체험 돋보기 10개로 초기화</button>}
      {demoReward && <div className="demo-reward-confirm"><strong>실제 {demoReward === 'ad' ? '광고를 재생' : '친구에게 공유'}하지 않는 체험이에요.</strong><p>보상 완료와 취소 시 잔액 변화를 확인해 보세요.</p><button className="button button-primary" onClick={() => void confirmDemo()}>체험 완료 · {demoReward === 'ad' ? '+5개' : '+2개'}</button><button className="button button-text" onClick={() => setDemoReward(null)}>취소 · 지급 안 함</button></div>}
    </Dialog>}
  </>;
}
