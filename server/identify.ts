import { askOpenAI } from './openai.ts';
export function validPlantImage(image: unknown): image is string { return typeof image === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) && image.length <= 4_000_000; }
export async function identifyPlant(image: string): Promise<Record<string, unknown>> {
  const result = await askOpenAI([
    { type: 'text', text: '사진 속 식물을 식별해 주세요. 꽃뿐 아니라 꽃이 피지 않은 나무, 관목, 풀, 잎이 보이는 관엽식물도 대상입니다. 꽃이 없다는 이유로 실패로 처리하지 마세요. 식물이 보이지 않거나 식별할 수 없으면 {"found":false}를 반환하세요. 일반적인 한국어 이름과 대표 꽃말 또는 상징을 간결하게 답하세요. 모르면 "알려진 상징 정보가 없어요"라고 쓰세요. 확신이 낮으면 confidence를 low로, 한국어 이름 앞에 "추정: "를 붙이세요. 반드시 {"found":true,"name":"한국어 이름","language":"한국어 꽃말 또는 상징","nameEn":"영어 이름","languageEn":"영어 꽃말 또는 상징","scientificName":"알 수 있으면 학명, 모르면 빈 문자열","confidence":"high 또는 medium 또는 low"} JSON 형식으로만 답하세요. 추가 이야기나 메모는 생성하지 마세요.' },
    { type: 'image_url', image_url: { url: image, detail: 'auto' } },
  ]);
  if (result.found === false) return { found: false };
  if (typeof result.name !== 'string' || !result.name.trim() || typeof result.language !== 'string') throw new Error('AI_INVALID_RESPONSE');
  return { found: true, name: result.name.slice(0, 100), language: result.language.slice(0, 300), nameEn: typeof result.nameEn === 'string' ? result.nameEn.slice(0, 100) : '', languageEn: typeof result.languageEn === 'string' ? result.languageEn.slice(0, 300) : '', scientificName: typeof result.scientificName === 'string' ? result.scientificName.slice(0, 150) : '', confidence: ['high', 'medium', 'low'].includes(String(result.confidence)) ? result.confidence : 'medium' };
}
