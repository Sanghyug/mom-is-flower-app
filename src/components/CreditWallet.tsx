import { useEffect, useRef, useState } from 'react';
import { Search, Share2, Play, Plus, Copy } from 'lucide-react';
import Dialog from './Dialog';
import { creditPolicy, type RewardKind } from '../lib/creditPolicy';
import { creditRequest, demoCredits, earnDemo, parseWallet, resetDemoWallet, type WalletState } from '../lib/creditClient';
import { referralShareURL } from '../lib/referralEntry';
import { runReward } from '../lib/rewardSdk';
import { isToss } from '../lib/photos';

export default function CreditWallet({ wallet, error, open, onOpenChange, onRefresh, onChange, notify }: {
  wallet: WalletState | null; error: string; open: boolean; onOpenChange: (open: boolean) => void; onRefresh: () => Promise<void>; onChange: (wallet: WalletState) => void; notify: (message: string) => void;
}) {
  const [working, setWorking] = useState(false);
  const [rewardError, setRewardError] = useState('');
  const [demoReward, setDemoReward] = useState<RewardKind | null>(null);
  const [inviteURL, setInviteURL] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open || demoCredits) return;
    void onRefresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void onRefresh(); }, 30000);
    return () => clearInterval(timer);
  }, [open]); // onRefresh reads current server state; polling runs only while this dialog is open.
  async function earnAd() {
    if (!wallet || working) return;
    if (demoCredits) { setDemoReward('ad'); return; }
    setWorking(true); setRewardError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const started = await creditRequest('wallet', { action: 'startReward', kind: 'ad' });
      const event = await runReward('ad', wallet, abort.signal);
      const receipt = { ticket: started.ticket, event };
      localStorage.setItem('plant-credit-pending-reward', JSON.stringify(receipt));
      const next = parseWallet(await creditRequest('wallet', { action: 'finishReward', ...receipt }));
      localStorage.removeItem('plant-credit-pending-reward'); onChange(next);
      notify('돋보기 2개가 충전됐어요.');
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setRewardError(e instanceof Error ? e.message : '보상을 확인하지 못했어요.'); }
    finally { setWorking(false); }
  }
  async function prepareInvite() {
    if (demoCredits) { notify('체험 모드에서는 실제 초대 링크를 발급하지 않아요. 새 친구의 첫 식물 찾기 성공 후 +5가 지급돼요.'); return; }
    setWorking(true); setRewardError('');
    try {
      const result = await creditRequest('referral', { action: 'link' });
      if (typeof result.url !== 'string') throw new Error('초대 링크를 확인하지 못했어요.');
      setInviteURL(await referralShareURL(result.url));
    } catch (e) { setRewardError(e instanceof Error ? e.message : '초대 링크를 만들지 못했어요.'); }
    finally { setWorking(false); }
  }
  async function sendInvite(copy: boolean) {
    if (!inviteURL) return;
    const message = `함께 나만의 정원을 만들어요 🌿\n꽃과 나무의 이름을 찾고 식물카드를 모아 보세요.\n${inviteURL}`;
    try {
      if (copy) { await navigator.clipboard.writeText(message); notify('초대 링크를 복사했어요. 친구가 첫 식물을 찾으면 +5개를 드려요.'); }
      else if (isToss) { const { share } = await import('@apps-in-toss/web-framework'); await share({ message }); }
      else if (navigator.share) await navigator.share({title:'함께 나만의 정원 만들기 · 엄마는꽃',text:message});
      else { await navigator.clipboard.writeText(message); notify('초대 링크를 복사했어요.'); }
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setRewardError('초대 링크를 보내지 못했어요. 링크 복사를 이용해 주세요.'); }
  }
  async function confirmDemo() {
    if (!demoReward) return;
    try { onChange(await earnDemo(demoReward)); setDemoReward(null); notify('체험용 돋보기를 충전했어요. 실제 광고는 실행하지 않았어요.'); }
    catch (e) { setRewardError(e instanceof Error ? e.message : '체험 보상 한도에 도달했어요.'); setDemoReward(null); }
  }
  return <>
    <div className="credit-strip"><span><Search size={20} />돋보기 <strong>{wallet ? `${wallet.balance}개` : error ? '연결 필요' : '연결 중'}</strong></span><button onClick={() => onOpenChange(true)}><Plus size={17} />충전하기</button></div>
    {demoCredits && <p className="credit-demo-banner">화면 체험 모드 · 실제 AI 호출·광고·공유 없이 돋보기 흐름만 확인해요.</p>}
    {open && <Dialog title="나의 돋보기" onClose={() => { controller.current?.abort(); onOpenChange(false); setWorking(false); setDemoReward(null); }}>
      <div className="credit-balance"><Search size={35} strokeWidth={1.5} /><strong>{wallet?.balance ?? '—'}<small>개</small></strong><p>처음 연결하면 돋보기 10개를 드려요.</p></div>
      <div className="credit-usage"><strong>식물 이름 찾기 · 돋보기 1개</strong><p>이름·꽃말·유래와 신화·설화를 함께 알려드려요.<br />메모 작성과 카드 저장은 추가 소모가 없어요.</p></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!wallet && <button className="button button-secondary" onClick={() => void onRefresh()}>돋보기 다시 연결하기</button>}
      <button className="button button-primary" disabled={!wallet || working || (!demoCredits && (!isToss || !wallet.rewards.ad)) || (wallet?.ads ?? 0) >= creditPolicy.adDailyLimit} onClick={() => void earnAd()}><Play size={21} />{working ? '잠시만 기다려 주세요' : demoCredits ? '광고 보상 체험 · +2개' : '광고 보고 돋보기 2개 받기'}</button>
      <button className="button button-secondary" disabled={!wallet || working} onClick={() => void prepareInvite()}><Share2 size={21} />친구 초대 링크 만들기 · +5개</button>
      <p className="storage-note">초대 링크로 처음 연결한 새 친구가 첫 식물 찾기에 성공하면 초대한 분에게 +5개를 드려요. 단순 공유·접속이나 기존 계정은 초대 보상 대상이 아니에요.</p>
      {inviteURL && <section className="card-link-panel" aria-label="친구 초대 링크"><p className="storage-note">내 초대 링크</p><p className="invite-url">{inviteURL}</p><div className="button-pair"><button className="button button-primary" onClick={() => void sendInvite(false)}><Share2 size={19} />친구에게 보내기</button><button className="button button-secondary" onClick={() => void sendInvite(true)}><Copy size={19} />링크 복사</button></div></section>}
      <p className="storage-note">광고는 시청 보상 완료 시 +2개, 식물카드 공유창 이용 시 +1개예요.<br />하루 광고 {creditPolicy.adDailyLimit}회 · 친구 초대 보상 {creditPolicy.shareDailyLimit}명 · 카드 공유 {creditPolicy.cardShareDailyLimit}회까지 받을 수 있어요. 초대 한도를 넘은 날의 추가 완료 건은 이월되지 않아요.</p>
      <button className="button button-text" disabled={working} onClick={() => void onRefresh()}>받은 초대 보상·잔액 새로고침</button>
      {rewardError && <p className="inline-error" role="alert">{rewardError}</p>}
      {demoCredits && <button className="button button-text" onClick={() => { onChange(resetDemoWallet()); setDemoReward(null); setRewardError(''); }}>체험 돋보기 10개로 초기화</button>}
      {demoReward && <div className="demo-reward-confirm"><strong>실제 광고를 재생하지 않는 체험이에요.</strong><button className="button button-primary" onClick={() => void confirmDemo()}>체험 완료 · +2개</button><button className="button button-text" onClick={() => setDemoReward(null)}>취소 · 지급 안 함</button></div>}
    </Dialog>}
  </>;
}
