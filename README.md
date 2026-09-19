# Dear Love 💌

지금, 이 자리에 편지를 두고 가세요.
**편지는 그 편지를 쓴 바로 그 장소로 돌아왔을 때만 열어볼 수 있어요.**

지도 위 원하는 곳(현재 위치)에서 편지를 쓰고 봉인하면, 그 위치를 기준으로 반경 안에
다시 들어와야만 내용을 확인할 수 있는 위치 기반 편지 웹사이트입니다.

## 사용 방법

1. 브라우저가 위치 정보 접근을 요청하면 허용해주세요.
2. 오른쪽 위 **✍️ 편지 쓰기** 버튼을 눌러 제목/내용과 열람 허용 반경(30m~1km)을 정합니다.
3. **🔒 이 자리에 편지 봉인하기**를 누르면 현재 위치에 편지가 저장됩니다.
4. 지도의 마커나 오른쪽 목록에서 편지를 클릭하면,
   - 봉인된 장소의 반경 안에 있을 때는 편지를 바로 읽을 수 있고,
   - 반경 밖에 있으면 🔒 잠금 상태와 함께 얼마나 더 가까이 가야 하는지 알려줍니다.
5. 다른 사람의 휴대폰에서도 같은 사이트에 접속해 같은 장소에 있으면 그 편지를 열어볼 수 있어요(편지는 기기가 아니라 서버 DB에 저장됩니다).
6. 내가 쓴 편지는 같은 브라우저에서만 삭제할 수 있어요(브라우저에 저장된 삭제 권한 토큰으로 확인).

## 동작 원리

- 브라우저의 [Geolocation API](https://developer.mozilla.org/docs/Web/API/Geolocation_API)로 실시간 현재 위치를 추적합니다.
- 편지를 봉인하면 프론트엔드가 좌표(위도/경도)·반경·본문을 API로 전송하고, 서버(AWS Lambda)가 **AWS RDS(MySQL)** 에 저장합니다.
- **위치 잠금은 클라이언트가 아니라 서버에서 검증합니다.** 편지를 열람할 때 현재 좌표를 API로 보내면, Lambda가 [Haversine 공식](https://en.wikipedia.org/wiki/Haversine_formula)으로 서버에 저장된 좌표와의 거리를 계산해 반경 이내일 때만 응답에 본문을 포함시킵니다. 반경 밖이면 본문 자체가 응답에 담기지 않으므로, 브라우저 개발자도구로 좌표를 조작해도 열람할 수 없습니다.
- 지도 표시는 [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) 타일을 사용하며, 장소 이름은 [Nominatim](https://nominatim.org/) 역지오코딩으로 best-effort 표시됩니다.
- 편지 삭제 권한은 봉인 시 발급되는 `ownerToken`을 브라우저 `localStorage`에만 저장해 확인합니다(편지 내용 자체는 localStorage에 저장되지 않습니다).

## 백엔드 아키텍처 (AWS)

```
브라우저 ── HTTPS ──▶ API Gateway (HTTP API) ──▶ Lambda (Spring Boot, MyBatis) ──▶ RDS MySQL (VPC 내부, 비공개)
```

- **API Gateway**: `POST /letters`, `GET /letters`, `GET /letters/{id}`, `DELETE /letters/{id}` 라우트를 Lambda로 프록시. CORS 허용.
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
- `src/App.jsx` — 상태/오케스트레이션
- `src/hooks/useGeolocation.js` — 실시간 위치 추적
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
