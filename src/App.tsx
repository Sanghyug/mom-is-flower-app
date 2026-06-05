import { useEffect, useState } from "react";
import {
  openCamera,
  OpenCameraPermissionError,
  fetchAlbumPhotos,
  FetchAlbumPhotosPermissionError,
} from "@apps-in-toss/web-framework";
import { Camera, Image as ImageIcon } from "lucide-react";
import PolaroidResult from "./components/PolaroidResult";
import FlowerArchiver from "./components/FlowerArchiver";

export type FlowerCard = {
  id: string;
  image: string;
  name: string;
  language: string;
  memo?: string;
  createdAt: string;
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flowerData, setFlowerData] = useState<{
    name: string;
    language: string;
  } | null>(null);
  const [archive, setArchive] = useState<FlowerCard[]>([]);

  useEffect(() => {
    const savedArchive = localStorage.getItem("mom-is-flower-archive");

    if (savedArchive) {
      setArchive(JSON.parse(savedArchive));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("mom-is-flower-archive", JSON.stringify(archive));
  }, [archive]);

  // 스마트폰 앨범/카메라 파일 선택 처리 핸들러
  const handleOpenCamera = async () => {
    try {
      const response = await openCamera({
        base64: true,
        maxWidth: 1024,
      });

      const imageUri = response.dataUri.startsWith("data:")
        ? response.dataUri
        : `data:image/jpeg;base64,${response.dataUri}`;

      setImageSrc(imageUri);
      await analyzeFlowerWithAI(imageUri);
    } catch (error) {
      if (error instanceof OpenCameraPermissionError) {
        alert("카메라 권한이 필요해요. 권한을 허용한 뒤 다시 시도해 주세요.");
        return;
      }

      console.error("카메라 실행 실패:", error);
      alert("카메라를 여는 중 문제가 발생했어요.");
    }
  };

  const handleFetchAlbumPhoto = async () => {
    try {
      const photos = await fetchAlbumPhotos({
        base64: true,
        maxWidth: 1024,
        maxCount: 1,
      });

      const firstPhoto = photos[0];

      if (!firstPhoto) {
        return;
      }

      const imageUri = firstPhoto.dataUri.startsWith("data:")
        ? firstPhoto.dataUri
        : `data:image/jpeg;base64,${firstPhoto.dataUri}`;

      setImageSrc(imageUri);
      await analyzeFlowerWithAI(imageUri);
    } catch (error) {
      if (error instanceof FetchAlbumPhotosPermissionError) {
        alert("사진첩 권한이 필요해요. 권한을 허용한 뒤 다시 시도해 주세요.");
        return;
      }

      console.error("앨범 불러오기 실패:", error);
      alert("앨범에서 사진을 가져오는 중 문제가 발생했어요.");
    }
  };

  // OpenAI GPT-4o 멀티모달 API 연동 함수
  const analyzeFlowerWithAI = async (base64Image: string) => {
    setIsAnalyzing(true);

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
    } catch (error) {
      console.error("AI 분석 실패:", error);
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`꽃 분석 실패: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToArchive = (savedImage: string, memo?: string) => {
    if (!flowerData) return;

    setArchive((prev) => [
      {
        id: crypto.randomUUID(),
        image: savedImage,
        name: flowerData.name,
        language: flowerData.language,
        memo,
        createdAt: new Date().toLocaleDateString("ko-KR"),
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-between px-6 py-4 select-none">
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

      {/* 하단 도감 히스토리 판 */}
      <FlowerArchiver
        archive={archive}
        onDelete={(id) =>
          setArchive((prev) => prev.filter((card) => card.id !== id))
        }
      />

      <footer className="mt-8 mb-6 text-center text-xs text-slate-400">
        © 2026 엄마는 꽃 · Apps in Toss test v8
      </footer>

      {/* 3단계: 분석 완료 폴라로이드 팝업 모달 */}
      {flowerData && imageSrc && (
        <PolaroidResult
          imageSrc={imageSrc}
          flowerName={flowerData.name}
          flowerLanguage={flowerData.language}
          onClose={() => setFlowerData(null)}
          onSaveToArchive={handleSaveToArchive}
        />
      )}
    </div>
  );
}
