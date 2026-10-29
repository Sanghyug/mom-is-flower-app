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
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `mom-is-flower.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type || 'image/jpeg' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: `${name} · 엄마는꽃`, text: `오늘 만난 ${name}, 상징과 꽃말은 ${meaning}\nhttps://mom-is-flower.vercel.app`, files: [file] });
    return '식물카드를 공유했어요.';
  }
  if (isToss) {
    const { share } = await import('@apps-in-toss/web-framework');
    await share({ message: `오늘 만난 식물은 ${name}. 상징과 꽃말은 ${meaning}이에요.\n엄마는꽃에서 나만의 식물카드를 만들어 보세요.\nhttps://mom-is-flower.vercel.app` });
    return '식물 이름과 꽃말을 공유했어요.';
  }
  await downloadCard(dataUrl, name);
  return '식물카드를 파일로 저장했어요. 메신저에서 사진으로 보내 주세요.';
}
