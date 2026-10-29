import { revokeCardLinkIfPresent } from './lib/cardLinks';
import BannerAd from './components/BannerAd';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, BookOpen, Camera, Check, ChevronRight, Flower2, Heart, Image as ImageIcon, Leaf, LoaderCircle, Search, Share2, Type } from 'lucide-react';
import FlowerArchiver from './components/FlowerArchiver';
import PolaroidResult from './components/PolaroidResult';
import Dialog from './components/Dialog';
import { changeCard, loadArchive } from './lib/archive';
import { parseFlower } from './lib/api';
import { isToss, pickTossPhoto, readPhoto } from './lib/photos';
import type { FlowerCard, FlowerResult } from './types';
import { track } from './lib/analytics';
import PlantProgress from './components/PlantProgress';
import { getPlantProgress } from './lib/plantLevel';
import CreditWallet from './components/CreditWallet';
import { demoCredits, loadWallet, recognizeWithCredits, parseWallet, type WalletState } from './lib/creditClient';
export type { FlowerCard, FlowerStory } from './types';

export default function App() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [walletError, setWalletError] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const photoRequestId = useRef(crypto.randomUUID());
  async function refreshWallet() {
    try { setWallet(await loadWallet()); setWalletError(''); }
    catch(e) { setWalletError(e instanceof Error ? e.message : '돋보기 잔액을 확인하지 못했어요.'); }
  }
  useEffect(() => { void refreshWallet(); }, []);
  const [page, setPage] = useState<'home' | 'archive'>('home');
  const [large, setLarge] = useState(() => { try { return localStorage.getItem('mom-flower-large-text') === 'true'; } catch { return false; } });
  const [archive, setArchive] = useState<FlowerCard[]>([]);
  const [archiveReady, setArchiveReady] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [guide, setGuide] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<FlowerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [undo, setUndo] = useState<FlowerCard | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    let active = true;
    loadArchive().then(cards => { if (active) { setArchive(cards); setArchiveReady(true); } }).catch((e: Error) => { if (active) setArchiveError(e.message); });
    return () => { active = false; requestRef.current?.abort(); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.largeText = String(large);
    try { localStorage.setItem('mom-flower-large-text', String(large)); } catch { /* The preference still works without storage. */ }
  }, [large]);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToast(''); setUndo(null); }, 7000);
  }
  function navigate(next: 'home' | 'archive') { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function pick(kind: 'camera' | 'album') {
    if (!isToss) { (kind === 'camera' ? cameraRef : albumRef).current?.click(); return; }
    setPicking(true); setError('');
    try { const photo = await pickTossPhoto(kind); if (photo) { photoRequestId.current = crypto.randomUUID(); setPending(photo); setResult(null); } }
    catch (e) { if (!/cancel|abort/i.test(String(e))) setError(e instanceof Error ? e.message : '사진을 가져오지 못했어요. 다시 시도해 주세요.'); }
    finally { setPicking(false); }
  }
  async function fileSelected(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0]; if (!file) return;
    setPicking(true); setError('');
    try { const photo = await readPhoto(file); photoRequestId.current = crypto.randomUUID(); setPending(photo); setResult(null); }
    catch (e) { setError(e instanceof Error ? e.message : '사진을 불러오지 못했어요.'); }
    finally { input.value = ''; setPicking(false); }
  }
  async function analyze() {
    if (!pending || busy) return;
    if (!wallet || wallet.balance < 1) { setError(wallet ? '돋보기가 부족해요. 먼저 충전해 주세요.' : '돋보기 서비스 연결을 준비하고 있어요. 충전하기에서 다시 연결할 수 있어요.'); return; }
    setBusy(true); setError(''); setResult(null); track('flower_analyze_started');
    const controller = new AbortController(); requestRef.current = controller;
    try {
      const data = await recognizeWithCredits(pending, photoRequestId.current, controller.signal);
      setWallet(parseWallet(data.wallet));
      if (!controller.signal.aborted) { setResult(parseFlower(data)); track('flower_analyze_succeeded'); }
    } catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : '식물을 찾지 못했어요. 다시 시도해 주세요.'); track('flower_analyze_failed'); void refreshWallet(); } }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function closePhoto() { requestRef.current?.abort(); setBusy(false); setPending(null); setResult(null); setError(''); }
  async function save(card: FlowerCard) {
    if (!archiveReady) throw new Error('식물도감을 사용할 수 없어요. 식물카드를 파일로 저장해 주세요.');
    await changeCard(card);
    track('flower_card_saved');
    setArchive(previous => [card, ...previous.filter(item => item.id !== card.id)]);
    notify('나의 식물도감에 소중히 담았어요.');
  }
  async function remove(card: FlowerCard) {
    await revokeCardLinkIfPresent(card.id);
    await changeCard(card.id);
    setArchive(previous => previous.filter(item => item.id !== card.id));
    setUndo(card); notify('식물 기록을 지웠어요.');
  }
  async function restore() {
    if (!undo) return;
    try { await save(undo); setUndo(null); notify('식물 기록을 다시 담았어요.'); } catch (e) { notify(e instanceof Error ? e.message : '기록을 복원하지 못했어요.'); }
  }
  async function shareApp() {
    try {
      const text = '산책길에 만난 꽃, 이름이 궁금하다면? 엄마는꽃에서 식물 이름과 이야기를 만나 보세요.\nhttps://mom-is-flower.vercel.app';
      if (isToss) { const { share } = await import('@apps-in-toss/web-framework'); await share({ message: text }); }
      else if (navigator.share) await navigator.share({ title: '엄마는꽃', text, url: 'https://mom-is-flower.vercel.app' });
      else { await navigator.clipboard.writeText(text); notify('앱 주소를 복사했어요. 친구에게 붙여 넣어 주세요.'); }
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) notify('공유하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  }
  const plantCount = getPlantProgress(archive).count;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">본문으로 이동</a>
    <header className="app-header">
      <button className="brand" onClick={() => navigate('home')} aria-label="엄마는꽃 처음 화면"><span className="brand-symbol"><Flower2 size={29} strokeWidth={1.5} /></span><span>엄마는꽃<small>당신의 일상에 피어나는 꽃</small></span></button>
      <button className={`text-size-button ${large ? 'is-active' : ''}`} aria-pressed={large} onClick={() => setLarge(!large)}><Type size={21} />큰 글씨{large && <Check size={17} />}</button>
    </header>
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={fileSelected} className="visually-hidden" aria-label="카메라로 식물 사진 찍기" tabIndex={-1} />
    <input ref={albumRef} type="file" accept="image/*" onChange={fileSelected} className="visually-hidden" aria-label="앨범에서 식물 사진 선택" tabIndex={-1} />
    <CreditWallet open={walletOpen} onOpenChange={setWalletOpen} wallet={wallet} error={walletError} onRefresh={refreshWallet} onChange={setWallet} notify={notify} />
    <main id="main-content">
      {page === 'home' ? <>
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="hero-copy"><span className="eyebrow"><Leaf size={16} /> 초록과 가까워지는 시간</span>
            <h1 id="hero-title">무슨 식물일까?<br />이름을 알면,<br className="desktop-break" /> <em>더 반가운 초록.</em></h1>
            <p className="hero-description">산책길에 만난 꽃과 나무.<br />사진으로 이름과 이야기를 알아보세요.</p>
            <div className="hero-actions"><button className="button button-primary" disabled={picking} onClick={() => void pick('camera')}><Camera size={23} />{picking ? '사진을 준비하고 있어요' : '사진 찍어 식물 이름 찾기'}<ArrowRight size={21} className="button-arrow" /></button>
              <button className="button button-secondary" disabled={picking} onClick={() => void pick('album')}><ImageIcon size={22} />앨범에서 사진 고르기</button></div>
            <button className="subtle-link" onClick={() => setGuide(true)}>처음이세요? 이렇게 찍어 보세요 <ChevronRight size={17} /></button>
          </div>
          <div className="hero-image"><img src="/flower-hero.webp" alt="햇살 아래 연분홍 코스모스가 피어 있는 꽃밭" fetchPriority="high" /><span className="photo-note"><Flower2 size={17} />작은 발견이, 오늘의 행복이 되도록</span><span className="photo-caption">엄마는꽃 · 당신의 작은 초록 산책</span></div>
        </section>
        {error && !pending && <div className="inline-error" role="alert">{error}</div>}
        <section className="how-it-works" aria-label="식물을 만나는 세 가지 방법">
          <div><span className="step-number">01</span><strong>식물을 찍고</strong><p>잎과 꽃이 잘 보이게</p></div><div><span className="step-number">02</span><strong>이야기를 읽고</strong><p>이름부터 그 이야기까지</p></div><div><span className="step-number">03</span><strong>추억으로 간직해요</strong><p>나만의 식물카드로</p></div>
        </section>
        <PlantProgress archive={archive} />
        <section className="garden-preview"><div className="section-title"><div><span className="eyebrow">MY LITTLE GARDEN</span><h2>나의 작은 식물도감 <span>{plantCount}종</span></h2></div><button className="subtle-link" onClick={() => navigate('archive')}>모두 보기 <ChevronRight size={18} /></button></div>
          {archive.length ? <div className="recent-cards">{archive.slice(0, 3).map(card => <button key={card.id} className="recent-card" onClick={() => navigate('archive')}><img src={card.image} alt={`${card.name} 식물카드`} /><strong>{card.name}</strong><span>{card.memo || '식물을 만난 행복한 날'}</span></button>)}</div> : <div className="garden-empty"><span className="empty-flower"><Flower2 size={38} strokeWidth={1.25} /></span><div><h3>첫 번째 식물을 기다리고 있어요</h3><p>오늘 만난 식물에 이름을 붙여 주세요.<br />당신만의 식물도감이 시작돼요.</p></div><button className="round-arrow" aria-label="앨범에서 첫 식물 고르기" onClick={() => void pick('album')}><ArrowRight size={23} /></button></div>}
          {archiveError && <p className="inline-error" role="alert">{archiveError}</p>}
        </section>
        <section className="sharing-note"><Heart size={22} strokeWidth={1.5} /><div><h3>좋은 건, 함께 보고 싶으니까</h3><p>식물을 좋아하는 소중한 사람에게 알려 주세요.</p></div><button className="icon-button" aria-label="엄마는꽃 앱 공유하기" onClick={() => void shareApp()}><Share2 size={22} /></button></section>
      </> : <FlowerArchiver archive={archive} loading={!archiveReady && !archiveError} error={archiveError} onDelete={remove} onSave={save} onAdd={() => void pick('camera')} notify={notify} />}
      <BannerAd />
      <footer className="app-footer"><Flower2 size={18} /><p>식물을 만난 오늘도, 당신은 꽃이에요.</p><small>© 2026 BamnamuLab · 엄마는꽃</small></footer>
    </main>
    <nav className="bottom-nav" aria-label="주요 메뉴"><button aria-current={page === 'home' ? 'page' : undefined} onClick={() => navigate('home')}><Search size={23} /><span>식물 이름 찾기</span></button><button aria-current={page === 'archive' ? 'page' : undefined} onClick={() => navigate('archive')}><BookOpen size={23} /><span>나의 식물도감</span><span className="nav-count">{archive.length}</span></button></nav>
    {guide && <Dialog title="식물 사진, 이렇게 찍어 보세요" onClose={() => setGuide(false)}><div className="guide-visual"><Flower2 size={65} strokeWidth={1} /><span className="focus-corner top-left" /><span className="focus-corner bottom-right" /></div><ol className="guide-list"><li><strong>잎이나 꽃을 가까이</strong><p>꽃은 꽃잎을, 나무는 잎과 줄기가 잘 보이게 찍어 주세요.</p></li><li><strong>밝은 곳에서 흔들림 없이</strong><p>여러 식물이 겹치면 이름을 찾기 어려울 수 있어요.</p></li><li><strong>찍어 둔 사진도 괜찮아요</strong><p>앨범에서 마음에 드는 식물 사진을 골라 보세요.</p></li></ol><button className="button button-primary" onClick={() => setGuide(false)}>알겠어요</button></Dialog>}
    {pending && !result && !walletOpen && <Dialog title={busy ? '식물의 이름을 찾고 있어요' : '이 식물이 궁금하신가요?'} onClose={closePhoto}><img src={pending} alt="분석할 식물 사진" className="photo-preview" />{busy ? <div className="analysis-state" role="status"><LoaderCircle size={30} className="spin" /><h3>잎과 꽃의 특징을 살펴보고 있어요</h3><p>이름·꽃말·유래와 이야기를 함께 정리하고 있어요.</p><button className="button button-secondary" onClick={closePhoto}>그만 찾기</button></div> : <><p className="photo-consent">{demoCredits ? '체험 모드예요. 사진을 전송하지 않고 모의 결과로 돋보기 흐름만 보여드려요.' : '선택한 사진은 식물을 알아보기 위해 AI 서비스(OpenAI)로 전송돼요.'}</p>{error && <p className="inline-error" role="alert">{error}</p>}{(!wallet || wallet.balance < 1) && <button className="button button-secondary" onClick={() => setWalletOpen(true)}>돋보기 충전·연결하기</button>}<button className="button button-primary" disabled={!wallet || wallet.balance < 1} onClick={() => void analyze()}><Search size={22} />{error ? '이 사진으로 다시 찾기 · 돋보기 1개' : '이 사진으로 찾기 · 돋보기 1개'}</button><button className="button button-text" onClick={closePhoto}>다른 사진 고르기</button><p className="storage-note">같은 요청을 다시 확인할 때는 중복 차감하지 않아요. 이름을 찾지 못하거나 서버 오류가 나면 돋보기를 돌려드려요.</p></>}</Dialog>}
    {pending && result && <PolaroidResult photo={pending} result={result} onClose={closePhoto} onSave={save} notify={notify} />}
    {toast && <div className="toast" role="status"><Check size={20} /><span>{toast}</span>{undo && <button onClick={() => void restore()}>되돌리기</button>}<button className="toast-dismiss" aria-label="알림 닫기" onClick={() => { setToast(''); setUndo(null); }}>×</button></div>}
  </div>;
}
