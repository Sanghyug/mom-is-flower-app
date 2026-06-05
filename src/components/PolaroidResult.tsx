import { useRef, useState } from "react";
import { Download, X, Share2, Pencil } from "lucide-react";

// 📱 앱인토스 네이티브 브릿지 타입 정의
declare global {
  interface Window {
    TossWebViewBridge?: {
      postMessage: (message: string) => void;
    };
  }
}

interface Props {
  imageSrc: string;
  flowerName: string;
  flowerLanguage: string;
  onClose: () => void;
  onSaveToArchive: (savedImage: string, memo?: string) => void;
}

export default function PolaroidResult({
  imageSrc,
  flowerName,
  flowerLanguage,
  onClose,
  onSaveToArchive,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [memo, setMemo] = useState<string>("");

  // 1. [핵심 기능] 캔버스 이미지 생성 로직 (기존과 동일하되 날짜 포맷 살짝 수정)
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
        ctx.font = "italic 16px sans-serif";
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

  // 2. [앱인토스 AX] 네이티브 공유 패널 띄우기 (저장/공유 공통 사용)
  const handleSave = async () => {
    try {
      const finalImageBase64 = await generatePolaroidBase64();

      // 앱 내부 꽃 도감에 저장
      onSaveToArchive(finalImageBase64, memo);

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
        text: "엄마는꽃에서 만든 나만의 꽃카드예요 🌸",
      });
    } catch (error) {
      console.error("이미지 공유 실패:", error);
      alert("꽃카드 이미지 공유 중 문제가 발생했어요.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center p-6 z-50 overflow-y-auto">
      <canvas ref={canvasRef} width={400} height={540} className="hidden" />

      {/* 실물 뷰어 카드 (기존과 동일) */}
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

      {/* ✍️ 메모 입력창 (기존과 동일) */}
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

      {/* 🛠️ 개선된 액션 버튼 세트 (앱인토스 AX 연동) */}
      <div className="w-full max-w-sm flex gap-3 mt-4">
        {/* '저장' 버튼: 이제 토스 네이티브 공유 패널을 열어 사장님이 직접 사진첩에 저장하거나 보낼 수 있게 합니다. */}
        <button
          onClick={handleSave}
          className="flex-1 py-4 bg-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 active:scale-[0.99] transition-all"
        >
          <Download size={20} />
          저장하기
        </button>

        {/* '공유하기' 버튼: 저장 버튼과 동일하게 작동하도록 임시 활성화 (사장님 요청사항) */}
        <button
          onClick={handleShare}
          className="w-16 py-4 bg-white text-slate-500 font-medium rounded-xl flex items-center justify-center shadow-lg active:scale-[0.99] transition-all"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
}
