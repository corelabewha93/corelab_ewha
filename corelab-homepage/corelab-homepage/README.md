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

### People 페이지: 이름/사진을 누르면 펼쳐지는 상세 이력

`people.json`의 각 사람 항목에 `"detail": ["줄1", "줄2", ...]` 형태로 배열을 추가하면,
People 페이지에서 그 사람의 이름이나 사진을 눌렀을 때 상세 이력이 펼쳐집니다.
`detail` 필드를 아예 넣지 않으면 펼치기 버튼 자체가 생기지 않습니다 (일반 텍스트처럼 보임).

### 관리자 편집 기능: 홈페이지 안에서 모든 콘텐츠 추가·수정·삭제

맨 아래(푸터)의 작은 **"관리자 로그인"**에 GitHub 개인 토큰(PAT)을 넣으면 관리자 모드가 됩니다.

| 페이지 | 할 수 있는 것 |
|---|---|
| About | 제목·부제·소개글·연구분야 태그 수정 (✎ 버튼) |
| News | 소식 추가(+ 소식 추가) / 수정·삭제(✎) — 대표 사진 업로드 포함 |
| Research | 탭마다 논문·연구과제·특허·시스템 추가 / 수정·삭제 |
| People | 구성원 추가 / 수정·삭제 / **순서 바꾸기** / 사진 위치·확대 조정 |
| Lab Life | 사진 여러 장 한 번에 추가 / 설명 수정·삭제 |
| 푸터 | 주소·이메일·전화 수정 (연락처 수정) |

- 저장하면 GitHub에 자동으로 커밋됩니다. **관리자 화면에는 바로 반영**되고,
  방문자 화면에는 자동 배포 후 1~2분 뒤 반영됩니다.
- 삭제는 실수 방지를 위해 "삭제" → "정말 삭제할까요?"를 두 번 눌러야 합니다.
- People의 재학생은 PhD → MA → BA(학부연구생, 있을 때만) 순서로 묶여 나옵니다.
  같은 묶음 안의 순서는 "↔ 순서 바꾸기" → ◀ ▶ → "순서 저장"으로 바꿉니다.
- 졸업생은 이름·사진만 보이고, 누르면 "현재 직장 / 직함"과 상세 이력이 펼쳐집니다.
- 사진 위치는 수정 창의 동그란 미리보기에서 사진을 끌고, 확대/좌우/상하 슬라이더로 세밀하게
  맞출 수 있습니다. (JSON에는 `"photoCrop": {"x": 50, "y": 30, "zoom": 1.4}` 로 저장)
- 입력 항목을 바꾸고 싶으면 `src/admin/schemas.js`만 고치면 됩니다.

**처음 한 번만 하면 되는 준비: GitHub 토큰 발급**

1. GitHub에 로그인한 상태로 <https://github.com/settings/tokens?type=beta> 로 이동합니다.
2. **"Generate new token"**을 누릅니다.
3. Token name에 아무 이름(예: corelab-admin)을 적습니다.
4. **Repository access**에서 "Only select repositories"를 고르고 `corelab_ewha` 저장소만
   선택합니다.
5. **Permissions → Repository permissions**에서 **Contents**를 찾아 **Read and write**로
   바꿉니다. (다른 권한은 건드리지 않아도 됩니다)
6. 맨 아래 **"Generate token"**을 누르면 `github_pat_...`로 시작하는 토큰이 딱 한 번
   보여집니다. 이 값을 복사해두세요 (다시 볼 수 없으니, 안전한 곳에 저장해두시길 권합니다).
7. 홈페이지의 "관리자 로그인"에 이 토큰을 붙여넣고 로그인하면 끝입니다. 이후에는 이
   브라우저에서 별도 로그아웃을 하지 않는 한 계속 로그인 상태가 유지됩니다.

⚠️ **주의:** 이 토큰은 `corelab_ewha` 저장소에만 쓸 수 있도록 범위를 좁혔더라도, 유출되면
누구나 그 저장소 내용을 바꿀 수 있으니 다른 사람과 공유하지 마세요. 저장소 설정(Settings →
Developer settings → Personal access tokens)에서 언제든 토큰을 삭제(revoke)할 수 있습니다.

**저장소 구조가 바뀌면?** (예: `corelab-homepage` 폴더를 없애고 저장소 루트로 파일을 옮기는 경우)
`src/admin/githubConfig.js` 파일의 `BASE_PATH` 값을 바꿔주면 됩니다.

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
