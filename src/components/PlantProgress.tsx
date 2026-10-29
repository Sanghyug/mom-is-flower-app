import { Leaf, Sprout, Trophy } from 'lucide-react';
import { getPlantProgress, plantLevels } from '../lib/plantLevel';

export default function PlantProgress({ archive }: { archive: readonly { name: string }[] }) {
  const progress = getPlantProgress(archive);
  return <section className="plant-progress" aria-label="식물 수집 레벨">
    <div className="plant-progress-heading"><span className="plant-level-icon">{progress.next ? <Sprout size={29} strokeWidth={1.5} /> : <Trophy size={29} strokeWidth={1.5} />}</span><div><span className="eyebrow">나만의 식물 수집</span><h2>Lv.{progress.level} <span>{progress.title}</span></h2></div><span className="plant-species-count"><Leaf size={17} />{progress.count}종</span></div>
    <p className="plant-level-description">{progress.description}</p>
    <div className="plant-level-caption"><span>식물 {progress.count}종 · 사진 기록 {archive.length}개</span><strong>{progress.next ? `다음 레벨까지 ${progress.remaining}종` : '최고 레벨에 도달했어요'}</strong></div>
    <div className="plant-level-bar" role="progressbar" aria-label="다음 수집 레벨 진행도" aria-valuemin={0} aria-valuemax={progress.next ? progress.next.minimum - progress.minimum : 1} aria-valuenow={progress.next ? progress.count - progress.minimum : 1} aria-valuetext={progress.next ? `${progress.count}종 수집, ${progress.next.minimum}종에서 레벨 ${progress.next.level}` : `${progress.count}종 수집, 최고 레벨`}><span style={{ width: `${progress.percent}%` }} /></div>
    <p className="plant-level-rule">{plantLevels.slice(1).map(item => `${item.minimum}종 Lv.${item.level}`).join(' · ')}<br />같은 이름의 식물은 여러 번 담아도 1종으로 세어요.</p>
  </section>;
}
