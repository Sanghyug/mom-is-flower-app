export const plantLevels = [
  { level: 1, minimum: 0, title: '들꽃 관심가', description: '길가의 작은 초록부터 만나 보세요.' },
  { level: 2, minimum: 10, title: '꽃길 산책가', description: '이름을 아는 식물이 하나둘 늘고 있어요.' },
  { level: 3, minimum: 30, title: '들꽃 탐험가', description: '산책길이 당신만의 식물도감이 되고 있어요.' },
  { level: 4, minimum: 60, title: '꽃도감 수집가', description: '꽃과 나무를 알아보는 눈이 자랐어요.' },
  { level: 5, minimum: 100, title: '들꽃 전문가', description: '100종의 식물을 만났어요. 새로운 발견을 계속해 보세요.' },
] as const;

export function normalizePlantName(name: string): string {
  return name.normalize('NFKC').replace(/^\s*추정\s*[:：]?\s*/, '').replace(/\(\s*추정\s*\)/g, '').replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
}

export function getPlantProgress(archive: readonly { name: string }[]) {
  const count = new Set(archive.map(card => normalizePlantName(card.name)).filter(Boolean)).size;
  let index = 0;
  for (let i = 1; i < plantLevels.length; i++) if (count >= plantLevels[i].minimum) index = i;
  const current = plantLevels[index];
  const next = plantLevels[index + 1] ?? null;
  const remaining = next ? next.minimum - count : 0;
  const percent = next ? (count - current.minimum) / (next.minimum - current.minimum) * 100 : 100;
  return { ...current, count, next, remaining, percent };
}
