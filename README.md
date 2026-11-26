# 엄마는꽃

사진으로 꽃과 나무의 이름·꽃말·이야기를 알아보고, 메모를 더한 식물카드를 나만의 도감에 모으는 독립 웹앱입니다.

- 작업 폴더: D:\Codex\mom-is-flower-app
- 원본 보관: C:\Users\parki\mom-is-flower-app (변경하지 않음)
- 저장소: https://github.com/Sanghyug/mom-is-flower-app
- 운영 주소: https://mom-is-flower.vercel.app
- React 19 · Vite 8 · Firebase 익명 인증 / Firestore · Vercel Functions

## 실행과 검사

Node.js 24에서 npm ci, npm run dev, npm test, npm run lint, npm run build를 실행합니다.
Vite 개발 서버는 /api 함수를 실행하지 않습니다. 실제 API는 Vercel 환경에서 검증합니다.
로컬 VITE_WALLET_DEMO=true는 개발 모드 전용이며 실제 AI·광고를 실행하지 않습니다.
Chrome 설치 후 모의 모드 개발 서버를 5179 포트에 실행하고 node scripts/browser-check.mjs로 모바일 흐름을 검증할 수 있습니다.

## 무료 분석 정책

익명 계정당 한국 시간 하루 5회, 자정 초기화, 이월 없음입니다. 서버가 잔여 횟수를 계산하며 브라우저가 보낸 잔액은 신뢰하지 않습니다.
같은 요청 ID·사진의 완료 결과는 중복 차감하지 않습니다. 식물 미발견·오류는 해당 날짜 횟수를 한 번만 복구하며, 전날 요청은 다음 날 한도를 늘리지 않습니다.
중단된 요청은 2분 후 잔액 조회 시 복구합니다. 전체 서비스 AI 호출 시도 한도는 AI_DAILY_LIMIT (기본 200)입니다.
IP 해시별 신규 익명 계정 생성은 하루 20개로 제한합니다. 익명 계정은 실제 사람 한 명을 식별하는 방식이 아닙니다.

웹 사용량은 plant_web_daily_usage/{uid}와 하위 operations, 가입 제한은 plant_web_signup_limits에 저장합니다.
기존 plant_credit_wallets 등 토스 지갑 데이터는 변경하지 않습니다. 새 컬렉션은 클라이언트 직접 접근을 허용하지 않습니다.
Firestore의 다른 광역 allow 규칙이 없는지 확인해야 하며, 명시적 deny만 추가해도 광역 allow가 상쇄되지는 않습니다.
operations.expiresAt 등 만료 필드는 TTL을 별도로 켜야 실제 삭제됩니다. 카드의 만료 접근 차단은 서버에서 별도 검사합니다.

도감은 현재 브라우저의 IndexedDB에 저장합니다. 같은 브라우저의 이전 로컬 키는 보존·이전하지만 토스·다른 기기·새 도메인으로 자동 동기화되지 않습니다.
중요 카드는 이미지 파일로 저장하세요. 선택한 카드만 30일 링크로 공유하며 소유자가 중단할 수 있습니다.
광고·초대·카드 공유 보상은 종료했습니다. 예전 /invite/:code와 /toss 링크는 홈으로 안내합니다.

## 광고와 발행

AdSense는 무료 분석과 분리되며 광고 콜백은 지갑 API를 호출하지 않습니다.
.env.production에는 myMoon과 같은 공개 게시자 ID만 들어 있습니다. 유효한 게시자 ID로 빌드하면 google-adsense-account 메타 태그와 ads.txt가 생성됩니다.
실제 광고는 기본 비활성화입니다. 이 사이트를 AdSense에 별도 등록·심사한 뒤 VITE_ADSENSE_ENABLED=true와 VITE_ADSENSE_SLOT을 설정해 재배포합니다.
myMoon의 심사 결과가 자동 적용되지 않습니다. EEA·영국·스위스 광고 송출 전 Google 인증 CMP 등 개인정보 및 메시지 설정을 확인하세요.
소개·개인정보처리방침·약관·문의 페이지를 제공합니다. 현재 문의 채널은 GitHub Issues이며 개인정보를 공개 게시하지 않도록 안내합니다.
새 도메인 연결 시 index.html canonical/OG, sitemap.xml, robots.txt, PUBLIC_APP_ORIGIN, Firebase 허용 도메인을 함께 갱신하세요.

비밀키는 OPENAI_API_KEY 등 서버 전용 변수만 사용합니다. .env.example을 참고하세요.
Firebase 서버 인증은 기존 Vercel OIDC → Google Workload Identity를 유지합니다. .env*.local, .vercel, 테스트 토큰은 Git·배포에서 제외합니다.
2026-10 문서는 이전 토스 버전의 이력입니다. 현재 정책은 이 README와 docs/web-transition-20261127.md를 기준으로 합니다.
