export async function makeCard(photo: string, name: string, meaning: string, memo: string, createdAt: string): Promise<string> {
  await document.fonts.ready;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('식물카드를 만들지 못했어요. 다시 시도해 주세요.')); img.src = photo;
  });
  const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 990;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('식물카드를 만들지 못했어요.');
  const ctx: CanvasRenderingContext2D = context;
  ctx.fillStyle = '#fcfaf4'; ctx.fillRect(0, 0, 720, 990);
  const side = Math.min(image.width, image.height);
  ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 36, 36, 648, 648);
  ctx.fillStyle = '#264d3e'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText(name, 40, 749, 640);
  function wrap(text: string, y: number, maxLines: number) {
    let line = ''; let rows = 0;
    for (const letter of text) {
      if (ctx.measureText(line + letter).width > 636) {
        ctx.fillText(line, 42, y); y += 36; line = ''; rows++;
        if (rows >= maxLines) return;
      }
      line += letter;
    }
    if (rows < maxLines) ctx.fillText(line, 42, y);
  }
  ctx.fillStyle = '#9a5261'; ctx.font = '26px sans-serif'; wrap(`상징·꽃말 · ${meaning}`, 802, 2);
  ctx.fillStyle = '#525d54'; ctx.font = '25px sans-serif'; wrap(memo, 864, 2);
  ctx.strokeStyle = '#d6ddcf'; ctx.beginPath(); ctx.moveTo(42, 927); ctx.lineTo(678, 927); ctx.stroke();
  ctx.fillStyle = '#637661'; ctx.font = '20px sans-serif'; ctx.fillText('엄마는꽃', 42, 960);
  ctx.textAlign = 'right'; ctx.fillText(new Date(createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }), 678, 960);
  return canvas.toDataURL('image/jpeg', 0.85);
}
