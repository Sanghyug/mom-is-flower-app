import type { FlowerCard } from '../types';

const legacyKey = 'mom-is-flower-archive';
function isCard(value: unknown): value is FlowerCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as FlowerCard;
  return typeof card.id === 'string' && typeof card.image === 'string' && typeof card.name === 'string' && typeof card.language === 'string' && typeof card.createdAt === 'string';
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mom-is-flower', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('cards', { keyPath: 'id' });
      request.result.createObjectStore('meta');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('꽃도감을 열지 못했어요. 저장 공간을 확인한 뒤 앱을 다시 열어 주세요.'));
  });
}
export async function loadArchive(): Promise<FlowerCard[]> {
  const db = await openDatabase();
  const legacy = localStorage.getItem(legacyKey);
  // Read and validate before starting a transaction. Never overwrite the original storage.
  let oldCards: FlowerCard[] = [];
  let legacyError = false;
  if (legacy) {
    try { const parsed: unknown = JSON.parse(legacy); if (Array.isArray(parsed) && parsed.every(isCard)) oldCards = parsed; else legacyError = true; }
    catch { legacyError = true; }
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cards', 'meta'], 'readwrite');
    const cards = tx.objectStore('cards');
    const meta = tx.objectStore('meta');
    let result: FlowerCard[] = [];
    const migrated = meta.get('legacy-migrated');
    migrated.onsuccess = () => {
      if (!migrated.result) {
        if (legacyError) { tx.abort(); return; }
        oldCards.forEach(card => cards.put(card));
        meta.put(true, 'legacy-migrated');
      }
      const read = cards.getAll();
      read.onsuccess = () => { result = (read.result as FlowerCard[]).reverse().sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)); };
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(new Error(legacyError ? '이전 꽃도감에 읽기 어려운 기록이 있어요. 원본은 보존했으니 앱 관리자에게 문의해 주세요.' : '꽃도감을 불러오지 못했어요. 앱을 다시 열어 주세요.'));
  });
}
export async function changeCard(card: FlowerCard | string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('cards', 'readwrite');
    const store = tx.objectStore('cards');
    if (typeof card === 'string') store.delete(card); else store.put(card);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(new Error('저장 공간이 부족하거나 꽃도감을 수정할 수 없어요. 사진을 파일로 저장해 주세요.'));
  });
}
