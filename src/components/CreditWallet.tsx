import { Search } from 'lucide-react';
import Dialog from './Dialog';
import type { WalletState } from '../lib/creditClient';
import { dailyFreeLimit } from '../lib/dailyQuota';

export default function CreditWallet({ open, onOpenChange, wallet, error, onRefresh }: {
  open: boolean; onOpenChange: (value: boolean) => void; wallet: WalletState | null; error: string; onRefresh: () => Promise<void>;
}) {
  return <>
    <div className="credit-strip"><span><Search size={20} />오늘 무료 분석 <strong>{wallet ? `${wallet.balance}회 남음` : error ? '연결 필요' : '연결 중'}</strong></span><button onClick={() => onOpenChange(true)}>이용 안내</button></div>
    {open && <Dialog title="오늘의 무료 분석" onClose={() => onOpenChange(false)}>
      <div className="credit-balance"><strong>{wallet?.balance ?? '—'}<small>회</small></strong><p>익명 계정당 하루 {dailyFreeLimit}회 무료로 찾아보세요.</p></div>
      <p>한국 시간 자정에 이용 횟수가 새로 시작돼요. 남은 횟수는 다음 날로 이월되지 않아요.</p>
      <p>식물 이름·꽃말·이야기를 한 번에 분석해요. 식물을 찾지 못하거나 분석 오류가 나면 횟수를 돌려드려요. 서비스 전체 이용량에 따라 일찍 마감될 수 있어요.</p>
      <p>광고 시청이나 공유는 분석 횟수에 영향을 주지 않아요. 카드 저장·도감 열람·공유는 분석 횟수를 사용하지 않아요.</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="button button-secondary" onClick={() => void onRefresh()}>남은 횟수 새로고침</button>
    </Dialog>}
  </>;
}
