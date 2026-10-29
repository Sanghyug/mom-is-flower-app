import type { FlowerResult, FlowerStory } from '../types';

export const storyFields: [keyof FlowerStory, string][] = [
  ['summary', '이 꽃을 소개해요'], ['season', '꽃이 피는 계절'],
  ['habitat', '어디에서 만날까요?'], ['features', '이렇게 알아보세요'],
  ['meaningOrigin', '꽃말에 담긴 마음'], ['origin', '이름과 고향'],
  ['legend', '전해 내려오는 이야기'], ['art', '문학과 예술 속에서'],
];

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export async function postApi(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 40000);
  try {
    const response = await fetch(`${apiBase}/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error('지금은 꽃을 찾는 분들이 많아요. 잠시 후 다시 시도해 주세요.');
      throw new Error('꽃 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut) {
      throw new Error('응답이 조금 늦어지고 있어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    }
    if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    throw error;
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export function parseFlower(data: unknown): FlowerResult {
  const value = data as Record<string, unknown> | null;
  if (!value || value.found === false) throw new Error('꽃을 알아보기 어려워요. 꽃 한 송이가 크게 나오도록 다시 찍어 주세요.');
  if (typeof value.name !== 'string' || !value.name.trim() || typeof value.language !== 'string') throw new Error('꽃 이름을 확인하지 못했어요. 다른 사진으로 다시 시도해 주세요.');
  return {
    name: value.name.slice(0, 100), language: value.language.slice(0, 300),
    nameEn: typeof value.nameEn === 'string' ? value.nameEn : undefined,
    languageEn: typeof value.languageEn === 'string' ? value.languageEn : undefined,
    scientificName: typeof value.scientificName === 'string' ? value.scientificName : undefined,
    confidence: ['high', 'medium', 'low'].includes(String(value.confidence)) ? value.confidence as FlowerResult['confidence'] : undefined,
  };
}
export function parseStory(data: unknown): FlowerStory {
  if (!data || typeof data !== 'object') throw new Error('꽃 이야기를 읽어오지 못했어요. 다시 시도해 주세요.');
  const value = data as Record<string, unknown>;
  if (!storyFields.every(([key]) => typeof value[key] === 'string')) throw new Error('꽃 이야기를 읽어오지 못했어요. 다시 시도해 주세요.');
  return Object.fromEntries(storyFields.map(([key]) => [key, String(value[key]).slice(0, 2000)])) as FlowerStory;
}
