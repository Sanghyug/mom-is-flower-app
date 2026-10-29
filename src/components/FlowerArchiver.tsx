import { useState } from 'react';
import { Camera, Flower2, Search, Trash2 } from 'lucide-react';
import PolaroidResult from './PolaroidResult';
import Dialog from './Dialog';
import PlantProgress from './PlantProgress';
import type { FlowerCard } from '../types';

export default function FlowerArchiver({ archive, loading, error, onDelete, onSave, onAdd, notify }: {
  archive: FlowerCard[]; loading: boolean; error: string; onDelete: (card: FlowerCard) => Promise<void>;
  onSave: (card: FlowerCard) => Promise<void>; onAdd: () => void; notify: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FlowerCard | null>(null);
  const [deleting, setDeleting] = useState<FlowerCard | null>(null);
  const [working, setWorking] = useState(false);
  const cards = archive.filter(card => `${card.name} ${card.language} ${card.memo || ''}`.includes(query.trim()));
  async function remove() {
    if (!deleting || working) return;
    setWorking(true);
    try { await onDelete(deleting); setDeleting(null); }
    catch (e) { notify(e instanceof Error ? e.message : '식물 기록을 지우지 못했어요.'); }
    finally { setWorking(false); }
  }
  return <section className="archive-page"><span className="eyebrow"><LeafIcon /> MY LITTLE GARDEN</span><div className="archive-title"><div><h1>나의 식물도감</h1><p>식물을 만났던 순간을 다시 꺼내 보세요.</p></div><span className="archive-total">{archive.length}<small>개의 추억</small></span></div>
    <PlantProgress archive={archive} />
    <div className="archive-toolbar"><label className="search-field"><Search size={21} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="식물 이름이나 메모로 찾기" aria-label="식물도감 검색" /></label><button className="button button-primary" onClick={onAdd}><Camera size={21} />새 식물 담기</button></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {loading ? <p className="garden-empty" role="status">식물도감을 열고 있어요.</p> : cards.length ? <div className="archive-grid">{cards.map(card => <article className="archive-card" key={card.id}><button className="archive-card-open" onClick={() => setSelected(card)} aria-label={`${card.name} 식물 기록 열기`}><img src={card.image} alt={`${card.name} 식물카드`} loading="lazy" /><div><h2>{card.name}</h2><p>{card.memo || card.language}</p><time>{formatDate(card.createdAt)}</time></div></button><button className="archive-delete icon-button" aria-label={`${card.name} 기록 삭제`} onClick={() => setDeleting(card)}><Trash2 size={19} /></button></article>)}</div> : <div className="archive-empty"><Flower2 size={60} strokeWidth={1} /><h2>{query ? '아직 이 식물은 없네요' : '당신의 첫 식물을 기다려요'}</h2><p>{query ? '다른 이름이나 메모로 찾아보세요.' : '식물 이름과 그날의 마음을 차곡차곡 담아 보세요.'}</p>{!query && <button className="button button-primary" onClick={onAdd}><Camera size={22} />첫 번째 식물 만나기</button>}</div>}
    <p className="storage-note">이 기기에 저장된 식물도감이에요. 앱 데이터나 브라우저 기록을 지우면 사라질 수 있어요.</p>
    {selected && <PolaroidResult photo={selected.image} result={selected} saved={selected} onClose={() => setSelected(null)} onSave={onSave} notify={notify} />}
    {deleting && <Dialog title="이 식물 기록을 지울까요?" onClose={() => { if (!working) setDeleting(null); }}><p className="delete-description">{deleting.name}와 함께 남긴 사진과 메모가 식물도감에서 지워져요.</p><button className="button button-danger" disabled={working} onClick={() => void remove()}>{working ? '지우고 있어요' : '이 기록 지우기'}</button><button className="button button-secondary" disabled={working} onClick={() => setDeleting(null)}>그대로 간직하기</button></Dialog>}
  </section>;
}
function LeafIcon() { return <Flower2 size={17} />; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }); }
