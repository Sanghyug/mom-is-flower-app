import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Download, Heart, LoaderCircle, Share2, Volume2, VolumeX } from 'lucide-react';
import Dialog from './Dialog';
import { storyFields } from '../lib/api';
import { makeCard } from '../lib/card';
import { downloadCard, shareCard } from '../lib/photos';
import type { FlowerCard, FlowerResult, FlowerStory } from '../types';
import { creditPolicy } from '../lib/creditPolicy';

export default function FlowerResultView({ photo, result, saved, onClose, onSave, notify }: {
  photo: string; result: FlowerResult; saved?: FlowerCard; onClose: () => void;
  onSave: (card: FlowerCard) => Promise<void>; notify: (message: string) => void;
}) {
  const [memo, setMemo] = useState(saved?.memo || '');
  const story: FlowerStory | null = saved?.story || null;
  const [storyOpen, setStoryOpen] = useState(false);
  const storyLoading = false;
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [stored, setStored] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sessionId = useRef(saved?.id || crypto.randomUUID());
  const storyRef = useRef<HTMLElement>(null);
  useEffect(() => () => { request.current?.abort(); window.speechSynthesis?.cancel(); }, []);

  async function loadStory() {
    setStoryOpen(true);
    if (story) { storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (creditPolicy.storyCost === null) { setError('새 식물 이야기는 이용 기준을 준비하고 있어요. 이름과 꽃말로 메모 카드를 만들 수 있어요.'); return; }
  }

  async function cardImage() { return saved ? saved.image : makeCard(photo, result.name, result.language, memo.trim()); }
  async function save() {
    if (working) return;
    setWorking(true); setError('');
    try {
      const card: FlowerCard = { ...result, ...saved, id: sessionId.current, image: await cardImage(), memo: memo.trim(), createdAt: saved?.createdAt || new Date().toISOString(), ...(story ? { story } : {}) };
      await onSave(card); setStored(true);
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setWorking(false); }
  }
  async function exportCard(share: boolean) {
    if (working) return;
    setWorking(true); setError('');
    try { const image = await cardImage(); if (share) notify(await shareCard(image, result.name, result.language)); else { await downloadCard(image, result.name); notify('식물카드를 파일로 저장했어요.'); } }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError('식물카드를 내보내지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setWorking(false); }
  }
  function readAloud() {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = `${result.name}. 상징과 꽃말은 ${result.language}. ${story ? storyFields.map(([key]) => story[key]).join(' ') : ''}`;
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ko-KR'; utterance.rate = 0.88;
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setSpeaking(true);
  }
  return <Dialog title={saved ? '나의 식물 기록' : '오늘 만난 식물'} onClose={onClose} wide>
    <div className="result-layout"><div className="result-card"><img className={saved ? 'saved-card-image' : 'result-photo'} src={photo} alt={`${result.name} 사진`} /><div className="result-heading"><span className="eyebrow">A LITTLE GREEN IN YOUR DAY</span><h2>{result.name}</h2>{result.scientificName && <p className="scientific-name">{result.scientificName}</p>}<p className="flower-meaning"><Heart size={18} />상징·꽃말 · {result.language}</p></div></div>
      <div className="result-content">
        {!saved && <p className="identification-note">{result.confidence === 'low' ? '사진만으로 구별하기 어려운 식물이에요. 다른 각도에서도 확인해 보세요.' : 'AI가 사진으로 추정한 이름이에요. 비슷한 식물과 다를 수 있어요.'}</p>}
        <button className="button button-story" onClick={() => void loadStory()} disabled={!story}><BookOpen size={22} />{story ? '저장된 식물 이야기 읽기' : '꽃말의 유래·설화 · 준비 중'}{storyLoading && <LoaderCircle size={20} className="spin" />}</button>
        {!story && <p className="story-price-pending">기본 찾기는 이름과 꽃말·상징까지예요. 꽃말의 유래·설화는 돋보기 사용 기준을 준비하고 있어요.</p>}
        {!saved && <div className="memo-field"><label htmlFor="flower-memo">이 순간에 한마디 <span>선택</span></label><textarea id="flower-memo" value={memo} onChange={event => { setMemo(event.target.value); setStored(false); }} maxLength={40} placeholder="예: 엄마와 함께 걷던 산책길" rows={2} /><span className="character-count">{memo.length}/40</span></div>}
        {saved?.memo && <p className="saved-memo">“{saved.memo}”</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={working || stored} onClick={() => void save()}>{stored ? <Check size={22} /> : <BookOpen size={22} />}{stored ? '식물도감에 담았어요' : working ? '잠시만 기다려 주세요' : saved ? '식물카드 기록 저장' : '나의 식물도감에 담기'}</button>
        <div className="button-pair"><button className="button button-secondary" disabled={working} onClick={() => void exportCard(false)}><Download size={20} />파일 저장</button><button className="button button-secondary" disabled={working} onClick={() => void exportCard(true)}><Share2 size={20} />공유하기</button></div>
        <p className="storage-note">식물도감은 이 기기에 저장돼요. 소중한 식물카드는 파일로도 보관해 주세요.</p>
      </div></div>
    {storyOpen && <section className="flower-story" ref={storyRef} aria-label="식물 이야기"><div className="section-title"><h3>{result.name}의 이야기</h3>{'speechSynthesis' in window && <button className="subtle-link" onClick={readAloud}>{speaking ? <VolumeX size={21} /> : <Volume2 size={21} />}{speaking ? '읽기 멈추기' : '소리로 듣기'}</button>}</div>
      {storyLoading ? <p className="story-loading" role="status"><LoaderCircle size={22} className="spin" />꽃에 담긴 이야기를 가져오고 있어요.</p> : story ? <><p className="story-intro">{story.summary}</p><div className="story-sections">{storyFields.slice(1).map(([key, title]) => <section key={key}><h4>{title}</h4><p>{story[key] || '아직 알려진 이야기가 없어요.'}</p></section>)}</div><p className="storage-note">AI가 정리한 이야기로, 꽃말과 전설은 지역과 문화에 따라 다를 수 있어요.</p></> : <button className="button button-secondary" onClick={() => void loadStory()}>식물 이야기 다시 불러오기</button>}
    </section>}
  </Dialog>;
}
