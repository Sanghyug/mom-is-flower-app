import { askOpenAI } from './openai.ts';
export function validPlantImage(image: unknown): image is string { return typeof image === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) && image.length <= 4_000_000; }
export async function identifyPlant(image: string): Promise<Record<string, unknown>> {
  const result = await askOpenAI([
    { type: 'text', text: '사진 속 식물을 식별해 주세요. 꽃뿐 아니라 꽃이 피지 않은 나무, 관목, 풀, 잎이 보이는 관엽식물도 대상입니다. 꽃이 없다는 이유로 실패로 처리하지 마세요. 식물이 보이지 않거나 식별할 수 없으면 {"found":false}를 반환하세요. 일반적인 한국어 이름과 대표 꽃말 또는 상징을 간결하게 답하세요. 모르면 "알려진 상징 정보가 없어요"라고 쓰세요. 확신이 낮으면 confidence를 low로, 한국어 이름 앞에 "추정: "를 붙이세요. 반드시 {"found":true,"name":"한국어 이름","language":"한국어 꽃말 또는 상징","nameEn":"영어 이름","languageEn":"영어 꽃말 또는 상징","scientificName":"알 수 있으면 학명, 모르면 빈 문자열","confidence":"high 또는 medium 또는 low"} JSON 형식으로만 답하세요. 같은 응답에 story 객체를 반드시 포함하세요. story의 키는 summary(짧은 소개), habitat(서식지), origin(이름의 유래), season(계절), features(특징), meaningOrigin(꽃말·상징의 유래), legend(관련 신화·설화·전설), art(문화 속 식물)이며 각 값은 한국어 1~3문장입니다. 널리 알려진 실제 전승만 소개하고 지역·문화권을 명시하세요. 식물 종과 관련 없는 전설을 연결하거나 창작하지 마세요. 꽃말의 유래나 전승이 불확실하면 확인된 유래 또는 전승이 없다고 명확히 쓰세요. 전승을 역사적 사실처럼 표현하지 마세요. 사용자의 메모는 생성하지 마세요.' },
    { type: 'image_url', image_url: { url: image, detail: 'auto' } },
  ]);
  if (result.found === false) return { found: false };
  if (typeof result.name !== 'string' || !result.name.trim() || typeof result.language !== 'string') throw new Error('AI_INVALID_RESPONSE');
  const raw = result.story && typeof result.story === 'object' ? result.story as Record<string, unknown> : {};
  const story = Object.fromEntries(['summary','habitat','origin','season','features','meaningOrigin','legend','art'].map(key => [key, typeof raw[key] === 'string' && raw[key].trim() ? raw[key].slice(0, 2000) : '확인된 정보가 없어요.']));
  return { found: true, story, name: result.name.slice(0, 100), language: result.language.slice(0, 300), nameEn: typeof result.nameEn === 'string' ? result.nameEn.slice(0, 100) : '', languageEn: typeof result.languageEn === 'string' ? result.languageEn.slice(0, 300) : '', scientificName: typeof result.scientificName === 'string' ? result.scientificName.slice(0, 150) : '', confidence: ['high', 'medium', 'low'].includes(String(result.confidence)) ? result.confidence : 'medium' };
}
