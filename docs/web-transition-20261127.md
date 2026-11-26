# 독립 웹앱 전환 · 2026-11-27

토스 SDK·빌드·네이티브 카메라/저장/공유 분기·광고·초대 보상을 제거했습니다. 웹 사진 입력·JPEG 다운로드·Web Share/클립보드와 카드 공유 서버를 유지합니다. PWA는 항상 생성합니다.

## 서버와 데이터

일일 무료 분석은 src/lib/dailyQuota.ts의 5회 정책으로 실행하며 server/credits.ts에서 Firestore 트랜잭션으로 예약·정산합니다. plant_web_daily_usage, plant_web_signup_limits는 새 서버 전용 컬렉션입니다. 기존 지갑은 보존합니다. 전체 AI 한도는 기존 plant_credit_budget을 사용하여 전환 당일의 전체 호출량도 유지합니다.

Admin SDK로 접근하므로 클라이언트 쓰기 권한은 필요하지 않습니다. 광역 허용 규칙은 없어야 합니다. operations.expiresAt 등의 실제 삭제에는 Firestore TTL 별도 설정이 필요합니다.

인증된 사용자의 startReward, finishReward 요청은 410을 반환합니다. 광고·공유 보상으로 횟수를 늘리지 않습니다.

## 광고

myMoon 공식 사이트 mea-luna.com의 공개 메타 태그·ads.txt에서 게시자 ca-pub-4769167963051106을 확인했습니다. 게시자 확인 정보만 발행하고 광고 송출은 꺼둡니다. 이 사이트의 별도 심사·광고 단위 설정 후 활성화합니다.

Google 참고:
- https://support.google.com/adsense/answer/1348695
- https://support.google.com/adsense/answer/7670013

## 검증

한국 시간 자정, 5회 한도, 변조 잔액 무시, 중복 요청·사진 변경·진행 중 요청, 실패 1회 복구, 전날 요청의 다음 날 복구 차단을 검사합니다. 기존 AI 검증·공유 수명주기·레벨·인증 검사는 유지했습니다. 폐기한 토스 경제·초대 테스트는 새 정책 테스트로 대체했습니다.

브라우저 모의 검증과 실제 서버 검증을 구분합니다. scripts/browser-check.mjs는 모바일 분석·저장·재접속·한도 차단을 검증합니다. scripts/live-check.ps1은 신규 익명 QA 계정으로 실제 분석 1회와 공유 사본 생성·폐기를 검증하며, 테스트 토큰은 출력하지 않고 임시 파일을 삭제합니다. 결과는 로컬 artifacts/live-verification.json에 저장합니다.

## 운영 환경변수 정리

사용자 승인 후 기존 Vercel의 토스 배너·보상 ID, 첫 카드 프로모션·mTLS 변수, VITE_OPENAI_API_KEY를 제거했습니다. 서버용 OPENAI_API_KEY와 Firebase·공유 설정은 유지했습니다.

실제 검증용 배포에서 Firebase 익명 인증·Firestore 일일 한도 5→4·코스모스 분석·같은 요청 재시도 시 4 유지·가짜 광고 보상 차단·카드 링크 생성/폐기와 공유 후 횟수 4 유지를 확인했습니다. 모의 브라우저 검증에서는 5회 사용 후 여섯 번째 분석 차단, 모바일 화면, 카드 저장 및 새로고침 후 도감 보존, 정책 페이지, 광고 요청 없음, 브라우저 오류 없음을 확인했습니다.
