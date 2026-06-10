import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, BookOpen } from "lucide-react";
import PolaroidResult from "./components/PolaroidResult";
import FlowerArchiver from "./components/FlowerArchiver";
import SplashScreen from "./components/SplashScreen";

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
  const [showSplash, setShowSplash] = useState(true);

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
  const archiveSectionRef = useRef<HTMLDivElement>(null);
  const [matchedFlower, setMatchedFlower] = useState<FlowerCard | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

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
      const response = await fetch("/api/analyze-flower", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });

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

    const normalizedName = normalizeFlowerName(flowerData.name);

    setArchive((prev) => {
      const existingIndex = prev.findIndex(
        (item) => normalizeFlowerName(item.name) === normalizedName,
      );

      const nextCard: FlowerCard = {
        id: existingIndex >= 0 ? prev[existingIndex].id : crypto.randomUUID(),
        image: savedImage,
        name: flowerData.name,
        language: flowerData.language,
        story:
          story ?? (existingIndex >= 0 ? prev[existingIndex].story : undefined),
        memo,
        createdAt:
          existingIndex >= 0
            ? prev[existingIndex].createdAt
            : new Date().toLocaleDateString("ko-KR"),
      };

      if (existingIndex < 0) {
        return [nextCard, ...prev];
      }

      return [
        nextCard,
        ...prev.slice(0, existingIndex),
        ...prev.slice(existingIndex + 1),
      ];
    });
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert(
        "홈 화면에 추가하는 방법입니다.\n\n안드로이드 Chrome/Samsung Internet:\n오른쪽 위 메뉴(⋮ 또는 ≡) → 홈 화면에 추가 또는 앱 설치\n\n아이폰 Safari:\n공유 버튼 → 홈 화면에 추가\n\n설치 버튼이 바로 뜨지 않아도 위 방법으로 추가할 수 있어요.",
      );
      return;
    }

    deferredPrompt.prompt();

    const result = await deferredPrompt.userChoice;

    console.log("PWA install result:", result);

    setDeferredPrompt(null);
  };

  const handleShareApp = async () => {
    const shareData = {
      title: "엄마는 꽃",
      text: "길가다 마주친 예쁜 꽃의 이름과 꽃말을 찾아주는 AI 들꽃 도감 앱이에요.",
      url: "https://mom-is-flower.vercel.app",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("앱 주소를 복사했어요.");
      }
    } catch (error) {
      console.log("앱 공유 취소 또는 실패:", error);
    }
  };

  const handleOpenNaezzal = () => {
    window.open("https://naezzal4zzal-app.vercel.app", "_blank");
  };

  const getFlowerLevel = (count: number) => {
    if (count >= 100) {
      return {
        level: 5,
        title: "들꽃 전문가",
        icon: "👑",
        nextTarget: null,
        description:
          "꽃의 이름을 알고 계절을 읽을 수 있는 사람. 당신은 이제 진정한 들꽃 전문가입니다.",
      };
    }

    if (count >= 60) {
      return {
        level: 4,
        title: "꽃도감 수집가",
        icon: "🌺",
        nextTarget: 100,
        description:
          "수많은 꽃들이 당신의 기억 속에 피어났습니다. 작은 자연 도감이 완성되어 가고 있어요.",
      };
    }

    if (count >= 30) {
      return {
        level: 3,
        title: "들꽃 탐험가",
        icon: "🌷",
        nextTarget: 60,
        description:
          "이제는 꽃을 찾아 나서는 사람. 들판과 길섶에 숨은 아름다움을 발견하고 있네요.",
      };
    }

    if (count >= 10) {
      return {
        level: 2,
        title: "꽃길 산책가",
        icon: "🌼",
        nextTarget: 30,
        description:
          "꽃길을 걷다 보면 계절이 보입니다. 당신만의 꽃길이 만들어지고 있어요.",
      };
    }

    return {
      level: 1,
      title: "들꽃 관심가",
      icon: "🌱",
      nextTarget: 10,
      description:
        "들꽃에 관심을 갖기 시작했네요. 이름을 불러주면 당신에게 꽃이 됩니다.",
    };
  };

  const flowerLevelInfo = getFlowerLevel(archive.length);

  const remainingToNextLevel =
    flowerLevelInfo.nextTarget === null
      ? 0
      : Math.max(flowerLevelInfo.nextTarget - archive.length, 0);

  const previousTarget =
    flowerLevelInfo.level === 1
      ? 0
      : flowerLevelInfo.level === 2
        ? 10
        : flowerLevelInfo.level === 3
          ? 30
          : flowerLevelInfo.level === 4
            ? 60
            : 100;

  const progressPercent =
    flowerLevelInfo.nextTarget === null
      ? 100
      : Math.min(
          100,
          ((archive.length - previousTarget) /
            (flowerLevelInfo.nextTarget - previousTarget)) *
            100,
        );

  const handleOpenArchive = () => {
    archiveSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (showSplash) {
    return <SplashScreen />;
  }

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

      <button
        type="button"
        onClick={handleOpenArchive}
        className="w-full max-w-md mb-4 rounded-3xl bg-white border border-pink-100 p-5 shadow-sm text-left active:scale-[0.99] transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{flowerLevelInfo.icon}</span>

            <div>
              <div className="text-lg font-black text-slate-800">
                나의 꽃 도감
                <span className="ml-2 rounded-full bg-pink-100 px-2 py-1 text-sm text-pink-500">
                  {archive.length}송이
                </span>
              </div>

              <div className="mt-1 text-sm font-bold text-pink-500">
                Lv.{flowerLevelInfo.level} {flowerLevelInfo.title}
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {flowerLevelInfo.description}
              </p>
            </div>
          </div>

          <BookOpen size={22} className="text-pink-400 shrink-0 mt-1" />
        </div>

        <div className="mt-4 flex justify-between text-xs text-slate-500">
          <span>현재 {archive.length}송이 수집</span>
          <span>
            {flowerLevelInfo.nextTarget === null
              ? "최고 레벨 달성"
              : `다음 레벨까지 ${remainingToNextLevel}송이`}
          </span>
        </div>

        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-pink-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </button>

      <div className="w-full max-w-md my-5 flex items-center">
        <div className="flex-1 border-t border-dashed border-pink-100" />
        <span className="px-3 text-xs text-slate-400">더 알아보기</span>
        <div className="flex-1 border-t border-dashed border-pink-100" />
      </div>

      <div className="w-full max-w-md mb-6 flex flex-col gap-3">
        <button
          onClick={handleShareApp}
          className="w-full py-3 rounded-2xl bg-white border border-pink-100 text-pink-500 font-bold shadow-sm hover:bg-pink-50 transition-all"
        >
          💌 친구와 앱 공유하기
        </button>

        <button
          onClick={handleInstallApp}
          className="w-full py-3 rounded-2xl bg-slate-800 text-white font-bold shadow hover:bg-slate-700 transition-all"
        >
          📲 홈 화면에 추가하기
        </button>

        <div className="mt-4 rounded-3xl border border-pink-100 bg-pink-50/60 p-5 text-center shadow-sm">
          <img
            src="/bamnamulab-logo.png"
            alt="밤나무랩"
            className="mx-auto mb-3 h-12 w-12 object-contain"
          />

          <p className="text-sm font-bold text-slate-700">
            밤나무랩이 만든 다른 앱도 경험해보세요
          </p>

          <button
            type="button"
            onClick={handleOpenNaezzal}
            className="mt-4 w-full rounded-2xl bg-white border border-pink-100 px-4 py-4 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <img
                src="/naezzal4zzal-logo.png"
                alt="내짤4짤"
                className="w-14 h-14 rounded-xl object-cover"
              />

              <div className="text-left">
                <div className="text-lg font-black text-pink-500">내짤4짤</div>

                <div className="text-sm leading-5 text-slate-500 mt-1">
                  서랍에서 뒹굴고 있는 네컷사진을
                  <br />
                  귀여운 움짤로 만들어주는 앱
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 하단 도감 히스토리 판 */}
      <div ref={archiveSectionRef} className="w-full max-w-md">
        <FlowerArchiver
          archive={archive}
          onDelete={(id) =>
            setArchive((prev) => prev.filter((card) => card.id !== id))
          }
        />
      </div>

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
