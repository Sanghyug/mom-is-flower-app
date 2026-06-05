import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import PolaroidResult from "./components/PolaroidResult";
import FlowerArchiver from "./components/FlowerArchiver";

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

export type FlowerCard = {
  id: string;
  image: string;
  name: string;
  language: string;
  story?: FlowerStory;
  memo?: string;
  createdAt: string;
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flowerData, setFlowerData] = useState<{
    name: string;
    language: string;
    story?: FlowerStory;
  } | null>(null);
  const [archive, setArchive] = useState<FlowerCard[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const [matchedFlower, setMatchedFlower] = useState<FlowerCard | null>(null);

  useEffect(() => {
    const savedArchive = localStorage.getItem("mom-is-flower-archive");

    if (savedArchive) {
      setArchive(JSON.parse(savedArchive));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("mom-is-flower-archive", JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // 스마트폰 앨범/카메라 파일 선택 처리 핸들러
  const resizeImageFileToDataUrl = (
    file: File,
    maxWidth = 1024,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement("canvas");

          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("이미지 처리에 실패했어요."));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };

        img.onerror = () => {
          reject(new Error("이미지를 불러오지 못했어요."));
        };

        if (typeof reader.result === "string") {
          img.src = reader.result;
        } else {
          reject(new Error("이미지 파일을 읽지 못했어요."));
        }
      };

      reader.onerror = () => {
        reject(new Error("이미지 파일을 읽지 못했어요."));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const imageUri = await resizeImageFileToDataUrl(file, 1024);

      setImageSrc(imageUri);
      await analyzeFlowerWithAI(imageUri);
    } catch (error) {
      console.error("이미지 처리 실패:", error);
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`사진을 불러오는 중 문제가 발생했어요.\n${message}`);
    } finally {
      event.target.value = "";
    }
  };

  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleFetchAlbumPhoto = () => {
    albumInputRef.current?.click();
  };

  const normalizeFlowerName = (name: string) => {
    return name
      .replace(/^추정:\s*/, "")
      .replace(/\(추정\)/g, "")
      .replace(/\s/g, "")
      .trim();
  };

  // OpenAI GPT-4o 멀티모달 API 연동 함수
  const analyzeFlowerWithAI = async (base64Image: string) => {
    setIsAnalyzing(true);
    setMatchedFlower(null);

    try {
      const response = await fetch(
        "https://mom-is-flower.vercel.app/api/analyze-flower",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Image,
          }),
        },
      );

      const parsedData = await response.json();

      if (!response.ok) {
        throw new Error(parsedData.error || `API error: ${response.status}`);
      }

      // 3. 받아온 진짜 데이터를 상태에 주입
      setFlowerData({
        name: parsedData.name,
        language: parsedData.language,
      });
      const analyzedName = normalizeFlowerName(parsedData.name);

      const existingFlower = archive.find(
        (item) => normalizeFlowerName(item.name) === analyzedName,
      );

      if (existingFlower) {
        setMatchedFlower(existingFlower);
      }
    } catch (error) {
      console.error("AI 분석 실패:", error);
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`꽃 분석 실패: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToArchive = (
    savedImage: string,
    memo?: string,
    story?: FlowerStory,
  ) => {
    if (!flowerData) return;

    setArchive((prev) => [
      {
        id: crypto.randomUUID(),
        image: savedImage,
        name: flowerData.name,
        language: flowerData.language,
        story,
        memo,
        createdAt: new Date().toLocaleDateString("ko-KR"),
      },
      ...prev,
    ]);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert(
        "설치 기능이 준비되지 않았어요.\n\n아이폰은 Safari의 공유 버튼 → 홈 화면에 추가를 이용해주세요.",
      );
      return;
    }

    deferredPrompt.prompt();

    const result = await deferredPrompt.userChoice;

    console.log("PWA install result:", result);

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-between px-6 py-4 select-none">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFile}
      />

      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
      {/* 1단계: 메인 인트로 헤더 */}
      <header className="w-full text-center mt-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-3">
          엄마는 꽃 🌸
        </h1>
        <p className="text-sm font-medium text-slate-400 mt-1.5">
          길가다 마주친 예쁜 꽃의 이름을 찾아줄게요
        </p>
      </header>

      {/* 2단계: 메인 액션 및 로딩 패널 */}
      <main className="w-full max-w-md flex flex-col items-center justify-center flex-1 py-6">
        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-14 w-14">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-14 w-14 bg-pink-500 items-center justify-center text-xl">
                🌸
              </span>
            </div>
            <div className="mt-2">
              <p className="text-pink-600 font-bold text-base">
                AI가 꽃을 들여다보는 중
              </p>
              <p className="text-xs text-slate-400 mt-1">
                실시간으로 진짜 꽃 이름을 분석하고 있어요...
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3.5 relative">
            <button
              type="button"
              onClick={handleOpenCamera}
              className="w-full py-5 bg-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/10 hover:bg-pink-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer"
            >
              <Camera size={22} />
              사진 찍어 이름 찾기
            </button>

            <button
              type="button"
              onClick={handleFetchAlbumPhoto}
              className="w-full py-4.5 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200/80 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer"
            >
              <ImageIcon size={20} className="text-slate-400" />
              앨범에서 사진 가져오기
            </button>
          </div>
        )}
      </main>

      <div className="w-full max-w-md mb-6">
        <button
          onClick={handleInstallApp}
          className="w-full py-3 rounded-2xl bg-slate-800 text-white font-bold shadow hover:bg-slate-700 transition-all"
        >
          📲 앱으로 설치하기
        </button>
      </div>

      {/* 하단 도감 히스토리 판 */}
      <FlowerArchiver
        archive={archive}
        onDelete={(id) =>
          setArchive((prev) => prev.filter((card) => card.id !== id))
        }
      />

      <footer className="mt-8 mb-6 text-center text-xs text-slate-400">
        © 2026 엄마는 꽃 · AI 들꽃 도감
      </footer>

      {/* 3단계: 분석 완료 폴라로이드 팝업 모달 */}
      {flowerData && imageSrc && (
        <PolaroidResult
          imageSrc={imageSrc}
          flowerName={flowerData.name}
          flowerLanguage={flowerData.language}
          matchedFlower={matchedFlower}
          onClose={() => {
            setFlowerData(null);
            setMatchedFlower(null);
          }}
          onSaveToArchive={handleSaveToArchive}
        />
      )}
    </div>
  );
}
