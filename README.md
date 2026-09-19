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

## 동작 원리

- 브라우저의 [Geolocation API](https://developer.mozilla.org/docs/Web/API/Geolocation_API)로 실시간 현재 위치를 추적합니다.
- 편지를 봉인할 때의 좌표(위도/경도)와 함께 선택한 열람 반경을 저장합니다.
- 편지를 열람할 때마다 [Haversine 공식](https://en.wikipedia.org/wiki/Haversine_formula)으로 현재 위치와 편지 좌표 사이의 거리를 계산해, 반경 이내일 때만 내용을 보여줍니다.
- 지도 표시는 [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) 타일을 사용하며, 장소 이름은 [Nominatim](https://nominatim.org/) 역지오코딩으로 best-effort 표시됩니다.
- 모든 편지는 **브라우저의 `localStorage`** 에 저장됩니다. 별도 서버/DB 없이 정적 파일만으로 동작하는 클라이언트 사이드 앱이라, 편지는 편지를 쓴 기기·브라우저에만 남습니다(다른 기기와 공유되지 않습니다).

## 로컬 실행

빌드 과정 없이 정적 파일만으로 동작합니다.

```bash
npx serve .
# 또는
python3 -m http.server 8000
```

> 위치 정보 API는 보안상 `https://` 또는 `localhost` 환경에서만 동작합니다.

## 배포

정적 파일(`index.html`, `style.css`, `app.js`)만으로 구성되어 GitHub Pages로 바로 배포할 수 있습니다.

1. 저장소 **Settings → Pages**로 이동
2. Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 설정
3. 저장 후 `https://<username>.github.io/dear-love/` 에서 접속

## 기술 스택

- Vanilla HTML / CSS / JavaScript (빌드 도구 없음)
- [Leaflet.js](https://leafletjs.com/) — 지도
- [OpenStreetMap](https://www.openstreetmap.org/) 타일 + [Nominatim](https://nominatim.org/) 역지오코딩
- 브라우저 Geolocation API, localStorage

## 라이선스

MIT
