# Dear Love 💌

지금, 이 자리에 편지를 두고 가세요.
**편지는 그 편지를 쓴 바로 그 장소로 돌아왔을 때만 열어볼 수 있어요.**

지도 위 원하는 곳(현재 위치)에서 편지를 쓰고 봉인하면, 그 위치를 기준으로 반경 안에
다시 들어와야만 내용을 확인할 수 있는 위치 기반 편지 웹사이트입니다.

## 사용 방법

1. 접속하면 감성적인 시작 페이지가 먼저 나와요. **로그인 없이 둘러보기**로 지도만 구경하거나, **아이디/비밀번호**로 가입·로그인할 수 있어요(이메일 등 다른 정보는 필요 없어요).
2. 브라우저가 위치 정보 접근을 요청하면 허용해주세요.
3. 오른쪽 위 **✍️ 편지 쓰기** 버튼을 누르면 — 로그인 상태라면 제목/내용과 열람 허용 반경(30m~1km)을 정해 편지를 남길 수 있고, 로그인하지 않았다면 로그인 화면으로 안내돼요(편지 작성은 계정이 있어야 가능해요).
4. **🔒 이 자리에 편지 봉인하기**를 누르면 현재 위치에, 내 계정으로 편지가 저장됩니다.
5. 지도의 마커나 오른쪽 목록에서 편지를 클릭하면,
   - 봉인된 장소의 반경 안에 있을 때는 편지를 바로 읽을 수 있고 누가 썼는지도 표시되며,
   - 반경 밖에 있으면 🔒 잠금 상태와 함께 얼마나 더 가까이 가야 하는지 알려줍니다.
6. 편지 열람은 로그인 없이 누구나 할 수 있어요(위치 조건만 맞으면 됩니다) — 다른 사람의 휴대폰에서도 같은 장소에 있으면 열어볼 수 있어요.
7. 내가 쓴 편지는 내 계정으로 로그인했을 때만 삭제할 수 있어요.

## 동작 원리

- 브라우저의 [Geolocation API](https://developer.mozilla.org/docs/Web/API/Geolocation_API)로 실시간 현재 위치를 추적합니다.
- 편지를 봉인하면 프론트엔드가 좌표(위도/경도)·반경·본문을 API로 전송하고, 서버(AWS Lambda)가 **AWS RDS(MySQL)** 에 저장합니다.
- **위치 잠금은 클라이언트가 아니라 서버에서 검증합니다.** 편지를 열람할 때 현재 좌표를 API로 보내면, Lambda가 [Haversine 공식](https://en.wikipedia.org/wiki/Haversine_formula)으로 서버에 저장된 좌표와의 거리를 계산해 반경 이내일 때만 응답에 본문을 포함시킵니다. 반경 밖이면 본문 자체가 응답에 담기지 않으므로, 브라우저 개발자도구로 좌표를 조작해도 열람할 수 없습니다.
- 지도 표시는 [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) 타일을 사용하며, 장소 이름은 [Nominatim](https://nominatim.org/) 역지오코딩으로 best-effort 표시됩니다.
- **계정**: 아이디/비밀번호만으로 가입합니다(비밀번호는 BCrypt로 해시 저장). 로그인하면 서버가 세션 토큰을 발급하고, 편지를 봉인할 때마다 `Authorization: Bearer` 헤더로 함께 보내 작성자 계정을 편지에 기록합니다. 편지 열람 자체는 로그인 없이 누구나 가능합니다.
- 편지 삭제 권한은 (a) 로그인한 계정이 그 편지의 작성자와 같은지, 또는 (b) 계정 도입 이전에 만들어진 편지라면 봉인 시 발급된 `ownerToken`(브라우저 `localStorage`에만 저장)으로 확인합니다.

## 백엔드 아키텍처 (AWS)

```
브라우저 ── HTTPS ──▶ API Gateway (HTTP API) ──▶ Lambda (Spring Boot, MyBatis) ──▶ RDS MySQL (VPC 내부, 비공개)
```

- **API Gateway**: `POST /letters`, `GET /letters`, `GET /letters/{id}`, `DELETE /letters/{id}`, `POST /auth/signup`, `POST /auth/login` 라우트를 Lambda로 프록시. CORS 허용(`Authorization` 헤더 포함).
- **Lambda**: 서울 리전(ap-northeast-2), 런타임 `java21`, VPC 내부에서 실행되어 RDS에 비공개로 접속.
  [aws-serverless-java-container](https://github.com/aws/serverless-java-container)로 API Gateway HTTP API(payload
  v2.0) 요청을 그대로 Spring MVC 컨트롤러로 전달합니다(`StreamLambdaHandler`). 콜드 스타트 시 테이블을 자동
  생성합니다(`SchemaInitializer`).
- **RDS MySQL**: `db.t4g.micro` (프리티어), 퍼블릭 접근 차단, Lambda 보안 그룹에서만 3306 포트 접근 허용.
- **DB 접근 계층**: MyBatis (`backend/src/main/resources/mappers/LetterMapper.xml` + `LetterMapper` 인터페이스).
- 백엔드 소스는 `backend/` 폴더에 있는 Maven 프로젝트입니다 (Java 21, Spring Boot 3.5).
- API 주소는 프론트엔드의 `API_BASE` 상수에 하드코딩되어 있습니다.

### 백엔드 재배포

```bash
cd backend
mvn clean package -DskipTests
aws lambda update-function-code --function-name dear-love-api --zip-file fileb://target/dear-love-api.jar
```

## 프론트엔드 (React)

`frontend/` 폴더의 React + Vite 앱입니다. 실제 배포된 AWS API(`frontend/src/api.js`의 `API_BASE`)를 그대로 호출합니다.

```bash
cd frontend
npm install
npm run dev       # 로컬 개발 서버
npm run build      # dist/ 로 정적 빌드
```

> 위치 정보 API는 보안상 `https://` 또는 `localhost` 환경에서만 동작합니다.

구조:
- `src/App.jsx` — 상태/오케스트레이션 (로그인 여부에 따라 시작 페이지 ↔ 지도 화면 전환)
- `src/hooks/useGeolocation.js` — 실시간 위치 추적
- `src/hooks/useAuth.js` — 로그인 상태 관리 (세션 토큰을 `localStorage`에 보관)
- `src/components/LandingPage.jsx` — 시작 페이지 (로그인/회원가입, 둘러보기)
- `src/components/MapView.jsx` — Leaflet 지도 (편지 마커, 내 위치)
- `src/components/WriteModal.jsx`, `ReadModal.jsx` — 편지 쓰기/열람
- `src/api.js` — 백엔드 API 호출

## 배포

`frontend/`를 빌드해 GitHub Pages로 배포하는 GitHub Actions 워크플로가 이미 구성되어 있습니다
(`.github/workflows/deploy.yml`, `main` 브랜치의 `frontend/` 변경 시 자동 실행).

1. 저장소 **Settings → Pages** → Source를 **GitHub Actions**로 설정 (최초 1회)
2. `main`에 푸시하면 자동으로 빌드 후 배포됩니다
3. `https://<username>.github.io/dear-love/` 에서 접속 (`frontend/vite.config.js`의 `base`가 이 경로와 일치해야 합니다)

## 기술 스택

- **프론트엔드**: React 19 + Vite, [Leaflet.js](https://leafletjs.com/) 지도
- **백엔드**: Spring Boot 3 (Maven), MyBatis, AWS Lambda
- **DB**: AWS RDS MySQL
- [OpenStreetMap](https://www.openstreetmap.org/) 타일 + [Nominatim](https://nominatim.org/) 역지오코딩
- 브라우저 Geolocation API

## 라이선스

MIT
