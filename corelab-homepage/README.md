# CoreLab 홈페이지

이화여자대학교 교육공학과 CoreLab(임규연 교수) 연구실 홈페이지.
React + Vite로 만들어졌고, 별도 페이지 이동 없이 해시(`#/...`)로 라우팅합니다.

## 콘텐츠 수정 방법 (비개발자용)

**코드를 건드리지 않아도 됩니다.** 아래 JSON 파일만 수정하면 홈페이지 내용이 바뀝니다.

| 파일 | 내용 |
|---|---|
| `public/data/site.json` | About 페이지의 Lab Overview 소개글, Contact 정보 |
| `public/data/news.json` | News 카드 목록 |
| `public/data/research.json` | Publications / Projects / Patents / Systems & Tools |
| `public/data/people.json` | Faculty / Students / Alumni |
| `public/data/lablife.json` | Lab Life 갤러리 사진 |

### 수정 절차 (GitHub 웹사이트에서)

1. GitHub 저장소에서 수정하려는 JSON 파일을 클릭합니다.
2. 오른쪽 위 연필 아이콘(Edit)을 클릭합니다.
3. 내용을 수정합니다. **각 항목을 복사해서 붙여넣고 값만 바꾸면 형식이 깨지지 않습니다.**
   - 마지막 항목 뒤에는 쉼표(`,`)를 붙이지 마세요.
   - 따옴표(`"`) 짝이 맞는지 확인하세요.
4. 아래 "Commit changes" 버튼을 눌러 저장합니다.
5. 1~2분 뒤 자동으로 홈페이지가 업데이트됩니다. (Actions 탭에서 진행 상황 확인 가능)

### 사진 추가 방법

1. `public/images/` 안의 해당 폴더(`news`, `people`, `lablife`, `tools`)에 이미지 파일을 업로드합니다.
   (GitHub 저장소 → 폴더 진입 → "Add file" → "Upload files")
2. JSON 파일에서 이미지 경로를 `images/news/파일명.jpg` 처럼 적어줍니다. (앞에 `/` 없이)
3. 사진을 안 넣고 싶으면 해당 필드를 빈 문자열 `""`로 두면 됩니다. 자동으로 대체 화면이 표시됩니다.

각 JSON 파일의 정확한 항목(필드) 설명은 파일 안의 예시 데이터를 참고하세요.

## 로컬에서 실행하기 (개발자용)

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # dist/ 폴더에 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
```

## GitHub Pages 배포

1. GitHub 저장소 Settings → Pages → Source를 **"GitHub Actions"**로 설정합니다.
2. `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 빌드/배포합니다.
3. 저장소 이름이 `corelab-homepage`가 아니면 `vite.config.js`의 `REPO_NAME` 값을 실제 저장소 이름으로 바꿔주세요.

### 커스텀 도메인(corelab.ewha.ac.kr) 연결 시

학교 도메인 승인이 나면:

1. `public/CNAME` 파일을 새로 만들고 안에 `corelab.ewha.ac.kr` 한 줄만 적습니다.
2. `vite.config.js`에서 `base`를 `'/'`로 바꿉니다. (또는 `VITE_BASE` 환경변수를 워크플로우에서 지웁니다)
3. GitHub 저장소 Settings → Pages → Custom domain에 `corelab.ewha.ac.kr`을 입력합니다.
4. 학교 DNS 관리자가 해당 서브도메인이 GitHub Pages를 가리키도록 CNAME 레코드를 설정합니다.

도메인 연결 전까지는 `https://<GitHub 계정 또는 조직>.github.io/corelab-homepage/` 주소로 바로 이용할 수 있습니다.

## 디자인 가이드

- Primary `#00462A` (이화 그린): 헤더, 로고, 메인 버튼에만 제한적으로 사용
- Accent `#45A2BC` (Ewha Blue): 링크, 활성 탭, 강조 텍스트
- 색상 변수는 `src/styles/tokens.css`에서 관리합니다. 이 3가지 색 외에 채도 높은 색을 추가하지 마세요.
