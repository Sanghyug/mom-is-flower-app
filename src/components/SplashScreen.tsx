export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-[#fff7fb] flex flex-col items-center justify-center px-8 text-center">
      <img
        src="/splash.png"
        alt="엄마는 꽃"
        className="w-56 h-56 rounded-3xl object-cover shadow-xl mb-8"
      />

      <p className="mt-4 text-base leading-7 text-slate-500 font-medium">
        길가다 마주친
        <br />
        예쁜 꽃의 이름을 찾아줄게요
      </p>
    </div>
  );
}