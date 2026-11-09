# 우리 동네 미세먼지 신호등

한국환경공단 에어코리아의 시도별 실시간 측정정보를 보여주는 웹앱입니다.

## 구성
- `index.html`: 화면 구조
- `style.css`: 디자인 및 반응형 스타일
- `script.js`: 지역 선택, API 호출, 화면 표시
- `api/dust.js`: 에어코리아 API를 호출하는 Vercel 서버리스 함수

## 로컬 실행
1. Node.js를 설치합니다.
2. 터미널에서 프로젝트 폴더로 이동한 뒤 `npm install -g vercel`을 실행합니다.
3. `.env.local.example`을 복사해 `.env.local`로 이름을 바꿉니다.
4. `.env.local`의 `AIRKOREA_KEY`에 공공데이터포털에서 발급받은 서비스키를 입력합니다.
5. 터미널에서 `vercel dev`를 실행하고 안내된 로컬 주소로 접속합니다.

## Vercel 배포
1. GitHub 저장소에 프로젝트 파일을 올립니다.
2. Vercel에서 해당 GitHub 저장소를 Import합니다.
3. 프로젝트 Settings → Environment Variables에서 `AIRKOREA_KEY`를 추가합니다.
4. Deploy를 실행합니다.

**주의:** 실제 서비스키가 들어 있는 `.env.local`은 GitHub에 올리지 마세요.
