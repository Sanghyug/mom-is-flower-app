import { appEntryUrl } from './appLink';
export const isToss = import.meta.env.MODE === 'toss';

export function resizePhoto(source: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('사진을 준비하지 못했어요. 다시 선택해 주세요.')); return; }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => reject(new Error('사진을 열 수 없어요. JPG 또는 PNG 사진을 선택해 주세요.'));
    image.src = source;
  });
}
export async function readPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일을 선택해 주세요.');
  if (file.size > 25 * 1024 * 1024) throw new Error('사진 크기가 커요. 25MB 이하의 사진을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try { return await resizePhoto(url); } finally { URL.revokeObjectURL(url); }
}
export async function pickTossPhoto(kind: 'camera' | 'album') {
  const { openCamera, fetchAlbumPhotos } = await import('@apps-in-toss/web-framework');
  const picker = kind === 'camera' ? openCamera : fetchAlbumPhotos;
  const status = await picker.getPermission();
  if (status !== 'allowed' && await picker.openPermissionDialog() !== 'allowed') throw new Error('사진을 가져오려면 카메라 또는 사진 접근을 허용해 주세요. 토스 설정에서 권한을 바꿀 수 있어요.');
  const result = kind === 'camera' ? await openCamera({ base64: true, maxWidth: 1280 }) : (await fetchAlbumPhotos({ base64: true, maxCount: 1, maxWidth: 1280 }))[0];
  if (!result?.dataUri) return null;
  return resizePhoto(result.dataUri.startsWith('data:') ? result.dataUri : `data:image/jpeg;base64,${result.dataUri}`);
}
export async function downloadCard(dataUrl: string, name: string) {
  const safeName = name.replace(/[\\/:*?"<>|]/g, '').slice(0, 50) || '꽃';
  const mimeType = dataUrl.startsWith('data:image/png;') ? 'image/png' : 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  if (isToss) {
    const { saveBase64Data } = await import('@apps-in-toss/web-framework');
    await saveBase64Data({ data: dataUrl.split(',')[1], fileName: `엄마는꽃_${safeName}.${extension}`, mimeType });
    return;
  }
  const link = document.createElement('a');
  link.href = dataUrl; link.download = `엄마는꽃_${safeName}.${extension}`; link.click();
}
export async function shareCard(dataUrl: string, name: string, meaning: string) {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.startsWith('data:image/png;') ? 'image/png' : 'image/jpeg';
  const bytes = Uint8Array.from(atob(encoded), letter => letter.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const file = new File([blob], `mom-is-flower.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type || 'image/jpeg' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `${name} · 엄마는꽃`, text: `오늘 만난 ${name}, 상징과 꽃말은 ${meaning}\n${appEntryUrl}`, files: [file] });
      return '식물카드 공유 창을 열었어요.';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      // Some embedded WebViews advertise Web Share but reject file sharing.
    }
  }
  await downloadCard(dataUrl, name);
  return '식물카드를 파일로 저장했어요. 메신저에서 사진으로 보내 주세요.';
}
