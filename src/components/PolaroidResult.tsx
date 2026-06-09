import { useEffect, useRef, useState } from "react";
import { Download, X, Share2, Pencil, BookOpen } from "lucide-react";
import type { FlowerCard } from "../App";

export type FlowerStory = {
  summary: string;
  habitat: string;
  origin: string;
  season: string;
  features: string;
  meaningOrigin: string;
  legend: string;
  art: string;
};

interface Props {
  imageSrc: string;
  flowerName: string;
  flowerLanguage: string;
  matchedFlower?: FlowerCard | null;
  onClose: () => void;
  onSaveToArchive: (
    savedImage: string,
    memo?: string,
    story?: FlowerStory,
  ) => void;
}

export default function PolaroidResult({
  imageSrc,
  flowerName,
  flowerLanguage,
  matchedFlower,
  onClose,
  onSaveToArchive,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [memo, setMemo] = useState<string>("");
  const [story, setStory] = useState<FlowerStory | null>(null);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [shareCount, setShareCount] = useState(() => {
    const saved = localStorage.getItem("mom-is-flower-share-count");
    return saved ? Number(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem("mom-is-flower-share-count", String(shareCount));
  }, [shareCount]);

  useEffect(() => {
    if (matchedFlower?.story) {
      setStory(matchedFlower.story);
    }
  }, [matchedFlower]);

  const generatePolaroidBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;

      img.onload = () => {
        const drawCoverImage = (
          ctx: CanvasRenderingContext2D,
          img: HTMLImageElement,
          x: number,
          y: number,
          w: number,
          h: number,
        ) => {
          const imgRatio = img.width / img.height;
          const boxRatio = w / h;

          let sx = 0;
          let sy = 0;
          let sw = img.width;
          let sh = img.height;

          if (imgRatio > boxRatio) {
            sw = img.height * boxRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / boxRatio;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        };

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 400, 540);

        drawCoverImage(ctx, img, 20, 20, 360, 360);

        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(flowerName, 24, 415);

        ctx.fillStyle = "#EC4899";
        ctx.font = "bold 15px sans-serif";

        const wrapText = (
          text: string,
          x: number,
          y: number,
          maxWidth: number,
          lineHeight: number,
        ) => {
          let line = "";
          const words = text.split("");

          for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i];
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && i > 0) {
              ctx.fillText(line, x, y);
              line = words[i];
              y += lineHeight;
            } else {
              line = testLine;
            }
          }

          ctx.fillText(line, x, y);
        };

        wrapText(`꽃말 : ${flowerLanguage}`, 24, 468, 340, 22);

        ctx.fillStyle = "#475569";
        ctx.font = "italic 15px sans-serif";
        ctx.fillText(
          `✍️ ${memo.trim() || "예쁜 꽃을 마주친 행복한 날"}`,
          24,
          510,
        );

        ctx.fillStyle = "#94A3B8";
        ctx.font = "13px monospace";
        const today = new Date()
          .toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\. /g, ".")
          .slice(0, -1);

        ctx.fillText(today, 295, 525);

        resolve(canvas.toDataURL("image/png"));
      };
    });
  };

  const loadFlowerStory = async () => {
    if (shareCount < 3) {
      alert(
        `꽃카드를 3번 공유하면 이 꽃에 대한 다양한 이야기를 볼 수 있어요 🌸\n\n현재 공유: ${shareCount}/3`,
      );
      return;
    }
    if (story) {
      setIsStoryOpen(true);
      return;
    }

    setIsStoryLoading(true);

    try {
      const response = await fetch("/api/flower-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: flowerName,
        }),
      });

      const parsedData: any = await response.json();

      if (!response.ok) {
        throw new Error(parsedData.error || `API error: ${response.status}`);
      }

      setStory(parsedData);
      setIsStoryOpen(true);
    } catch (error) {
      console.error("꽃 이야기 불러오기 실패:", error);
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`꽃 이야기를 불러오지 못했어요: ${message}`);
    } finally {
      setIsStoryLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const finalImageBase64 = await generatePolaroidBase64();

      onSaveToArchive(finalImageBase64, memo, story ?? undefined);

      alert("꽃 카드가 나만의 꽃 도감에 저장되었어요.");
      onClose();
    } catch (error) {
      console.error("저장 중 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleShare = async () => {
    try {
      const finalImageBase64 = await generatePolaroidBase64();

      const blob = await fetch(finalImageBase64).then((res) => res.blob());

      const file = new File([blob], "mom-is-flower-card.png", {
        type: "image/png",
      });

      if (!navigator.share) {
        alert("현재 환경에서는 공유 기능을 지원하지 않아요.");
        return;
      }

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        alert("현재 환경에서는 이미지 파일 공유를 지원하지 않아요.");
        return;
      }

      await navigator.share({
        files: [file],
        title: "엄마는꽃",
        text: `엄마는꽃에서 만든 꽃카드예요 🌸

꽃 이름: ${flowerName}
꽃말: ${flowerLanguage}
${memo.trim() ? `메모: ${memo.trim()}` : ""}

나도 길가의 꽃 이름을 찾아보기
https://mom-is-flower.vercel.app`,
      });

      setShareCount((prev) => Math.min(prev + 1, 3));
    } catch (error) {
      console.error("이미지 공유 실패:", error);
      alert("꽃카드 이미지 공유 중 문제가 발생했어요.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center p-6 z-50 overflow-y-auto">
      <canvas ref={canvasRef} width={400} height={540} className="hidden" />

      <div className="bg-white p-5 rounded-sm shadow-2xl w-full max-w-sm flex flex-col gap-4 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="aspect-square w-full overflow-hidden rounded-sm bg-slate-100 relative">
          <img
            src={imageSrc}
            alt="촬영된 꽃"
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex justify-between items-baseline">
            <h3 className="text-xl font-bold text-slate-800">{flowerName}</h3>
            <span className="text-xs text-slate-400 font-mono">
              {new Date()
                .toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .replace(/\. /g, ".")
                .slice(0, -1)}
            </span>
          </div>

          <p className="text-sm text-pink-500 font-semibold">
            꽃말 : {flowerLanguage}
          </p>

          {matchedFlower && (
            <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 leading-relaxed">
              <p className="font-bold">🌼 이미 수집한 꽃이에요!</p>
              <p className="mt-0.5">첫 수집일: {matchedFlower.createdAt}</p>
              {matchedFlower.memo && (
                <p className="mt-0.5">그때의 메모: {matchedFlower.memo}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={loadFlowerStory}
            disabled={isStoryLoading}
            className="mt-2 w-full py-2.5 rounded-xl bg-pink-50 text-pink-600 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            <BookOpen size={16} />
            {isStoryLoading ? "꽃 이야기를 불러오는 중..." : `꽃 이야기 ${Math.min(shareCount, 3)}/3`}
          </button>

          <div className="mt-2 pt-2 border-t border-dashed border-slate-100">
            <p className="text-sm text-slate-600 font-medium italic min-h-[1.5rem]">
              {memo ? (
                `✍️ ${memo}`
              ) : (
                <span className="text-slate-300">메모가 여기에 남아요!</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm mt-4 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center gap-2">
        <Pencil size={16} className="text-pink-300 shrink-0" />
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={25}
          placeholder="함께 남길 메모를 적어보세요 (25자)"
          className="w-full bg-transparent text-white text-sm placeholder-white/50 focus:outline-none"
        />
      </div>

      <div className="w-full max-w-sm flex gap-3 mt-4">
        <button
          onClick={handleSave}
          className="flex-1 py-4 bg-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 active:scale-[0.99] transition-all"
        >
          <Download size={20} />
          저장하기
        </button>

        <button
          onClick={handleShare}
          className="w-16 py-4 bg-white text-slate-500 font-medium rounded-xl flex items-center justify-center shadow-lg active:scale-[0.99] transition-all"
        >
          <Share2 size={20} />
        </button>
      </div>

      {isStoryOpen && story && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[82vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800">
                {flowerName} 꽃 이야기
              </h3>
              <button
                onClick={() => setIsStoryOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <StorySection title="짧은 소개" text={story.summary} />
              <StorySection title="주로 피는 곳" text={story.habitat} />
              <StorySection title="원산지와 유래" text={story.origin} />
              <StorySection title="피는 시기" text={story.season} />
              <StorySection title="생김새와 특성" text={story.features} />
              <StorySection title="꽃말의 배경" text={story.meaningOrigin} />
              <StorySection title="설화와 민속" text={story.legend} />
              <StorySection title="문학과 예술" text={story.art} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StorySection({ title, text }: { title: string; text?: string }) {
  return (
    <section>
      <h4 className="text-sm font-bold text-pink-500 mb-1">{title}</h4>
      <p>{text || "정보 없음"}</p>
    </section>
  );
}
