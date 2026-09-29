/**
 * 관리자 입력창에 나오는 항목들. 항목을 추가/삭제하고 싶으면 여기만 고치면 됩니다.
 */

export const DEGREE_OPTIONS = [
  { value: 'PhD', label: 'PhD (박사)' },
  { value: 'MA', label: 'MA (석사)' },
  { value: 'BA', label: 'BA (학부연구생)' },
]

export const personFields = [
  {
    name: 'category',
    label: '분류',
    type: 'select',
    options: [
      { value: 'faculty', label: 'Faculty (교수)' },
      { value: 'students', label: 'Students (재학생)' },
      { value: 'alumni', label: 'Alumni (졸업생)' },
    ],
  },
  { name: 'name', label: '이름', type: 'text', required: true },
  {
    name: 'nameEn',
    label: '영어 이름',
    type: 'text',
    placeholder: '예: Hyejung Hwang',
    hint: '이름을 누르면 펼쳐지는 팝업에서 한글 이름 아래 작은 글씨로 표시됩니다. 해외 학회 등에 보여줄 때 유용해요.',
    showIf: (v) => v.category === 'students' || v.category === 'alumni',
  },
  { name: 'photo', label: '사진', type: 'image', folder: 'people' },
  { name: 'photoCrop', label: '사진 위치 · 확대', type: 'crop', imageField: 'photo' },
  {
    name: 'position',
    label: '직책',
    type: 'text',
    placeholder: '예: 교수 / 지도교수',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'degree',
    label: '과정',
    type: 'select',
    options: DEGREE_OPTIONS,
    default: 'MA',
    showIf: (v) => v.category === 'students' || v.category === 'alumni',
  },
  {
    name: 'affiliation',
    label: '소속',
    type: 'text',
    placeholder: '예: 이화여자대학교 교육공학과',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'affiliation',
    label: '현재 직장 / 직함',
    type: 'text',
    placeholder: '예: OO연구원 연구원',
    hint: '이름을 누르면 펼쳐지는 칸에 표시됩니다.',
    showIf: (v) => v.category === 'alumni',
  },
  {
    name: 'bio',
    label: '소개',
    type: 'textarea',
    rows: 4,
    hint: '교수 프로필에서는 문단형 소개글로, 학생 카드에서는 짧게 보여집니다.',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'bio',
    label: '한 줄 소개',
    type: 'text',
    hint: '이름을 누르면 펼쳐지는 칸 맨 위에 굵게 표시됩니다.',
    showIf: (v) => v.category === 'students' || v.category === 'alumni',
  },
  {
    name: 'pubNames',
    label: '논문에 적힌 다른 이름 (선택)',
    type: 'lines',
    rows: 2,
    placeholder: '예: Kim, H. J.',
    hint: '"OOO의 연구 실적 보기"는 한글 이름이 저자·발명자·옮긴이로 들어간 논문·저역서·특허를 자동으로 모읍니다. 영어 논문처럼 다른 표기(예: Kim, H. J.)로 실린 실적도 함께 모으려면 한 줄에 하나씩 적어주세요. 쉼표·점·띄어쓰기 차이는 상관없어요.',
    showIf: (v) => v.category === 'students' || v.category === 'alumni',
  },
  {
    name: 'hideResearch',
    label: '연구 실적 모아보기',
    type: 'select',
    default: '',
    options: [
      { value: '', label: '표시 (팝업에 "OOO의 연구 실적 보기" 버튼이 보임)' },
      { value: 'hidden', label: '숨김 (방문자에게 보이지 않음)' },
    ],
    hint: '본인이 원하지 않으면 "숨김"으로 두세요. 논문 목록 자체에서는 이름이 그대로 보이고, 이 사람만 모아 보는 화면만 숨겨집니다. 팝업 안의 "숨기기/표시하기" 버튼으로도 바꿀 수 있어요.',
    showIf: (v) => v.category === 'students' || v.category === 'alumni',
  },
  {
    name: 'email',
    label: '이메일',
    type: 'text',
    placeholder: '예: corelab@ewha.ac.kr',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'phone',
    label: '전화번호',
    type: 'text',
    placeholder: '예: 02-3277-0000',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'office',
    label: '연구실 위치',
    type: 'text',
    placeholder: '예: 교육관 B동 563호',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'researchInterests',
    label: '연구관심분야',
    type: 'tags',
    hint: '쉼표로 구분해서 적으세요.',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'scholarLink',
    label: 'Google Scholar 링크',
    type: 'text',
    placeholder: 'https://scholar.google.com/citations?user=...',
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'education',
    label: '학력',
    type: 'lines',
    hint: '한 줄에 한 항목씩. 예: The Pennsylvania State University Ph.D.(Instructional System)',
    rows: 3,
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'awards',
    label: '교내수상이력',
    type: 'lines',
    hint: '한 줄에 한 항목씩, "내용 | 날짜" 순서로 적으면 날짜가 오른쪽에 따로 표시됩니다. 예: 강의우수 | 2014-03-01',
    rows: 3,
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'career',
    label: '경력',
    type: 'lines',
    hint: '한 줄에 한 항목씩, "내용 | 날짜" 순서로 적으면 날짜가 오른쪽에 따로 표시됩니다. 예: 교육공학과장 | 2014-02-01 ~ 2018-01-31',
    rows: 5,
    showIf: (v) => v.category === 'faculty',
  },
  {
    name: 'detail',
    label: '상세 이력',
    type: 'lines',
    hint: '자유롭게 이력서처럼 작성하세요. 소제목으로 쓰고 싶은 줄은 맨 앞에 #을 붙이세요 (예: #학력). # 없이 쓴 줄은 그 소제목 아래 내용으로 보여집니다. 링크를 걸고 싶으면 "표시할 글자 | https://..." 형태로 쓰세요 (예: #개인 홈페이지 다음 줄에 Google Scholar | https://scholar.google.com/citations?...) — 그러면 "Google Scholar"라는 글자가 클릭 가능한 링크로 표시됩니다.',
    rows: 8,
    showIf: (v) => v.category !== 'faculty',
  },
]

export const newsFields = [
  { name: 'title', label: '제목', type: 'text', required: true },
  {
    name: 'subtitle',
    label: '소제목 (선택)',
    type: 'text',
    placeholder: '예: 2년간 연구비 지원받아',
    hint: '제목 아래에 조금 작게 나오는 부제목입니다. 비워두면 표시되지 않습니다.',
  },
  { name: 'images', label: '사진 (여러 장 함께 선택 가능)', type: 'image', folder: 'news', multiple: true },
  {
    name: 'imageWidth',
    label: '대표 사진 크기 (가로 픽셀)',
    type: 'number',
    placeholder: '예: 460 (비워두면 기본 크기)',
    hint: '숫자로 직접 크기를 정하세요. 더 작게 하려면 150~250, 기본은 460, 크게 하려면 600 이상, 화면 전체 너비로 하려면 900 이상을 입력하면 됩니다.',
  },
  {
    name: 'imageAlign',
    label: '대표 사진 정렬',
    type: 'select',
    default: 'center',
    options: [
      { value: 'left', label: '왼쪽' },
      { value: 'center', label: '가운데' },
      { value: 'right', label: '오른쪽' },
    ],
  },
  {
    name: 'body',
    label: '내용',
    type: 'paragraphs',
    rows: 10,
    hint:
      '기사처럼 자유롭게 적으세요. 문단 사이는 빈 줄로 구분하면 됩니다. 사진을 본문 중간에 넣고 싶으면, 넣고 싶은 위치에 [사진2], [사진3]처럼 한 줄만 따로 적으세요 (숫자는 위에서 선택한 사진 순서, 첫 번째 사진은 이미 대표 사진으로 맨 위에 쓰이니 2번째부터 씁니다). 정렬도 함께 정하고 싶으면 [사진2:왼쪽], [사진2:오른쪽]처럼 뒤에 붙이면 됩니다 (안 쓰면 가운데 정렬). 아무 표시도 안 하면 남은 사진은 글 맨 아래에 모아서 보여줍니다.',
  },
  { name: 'link', label: '관련 링크 (선택)', type: 'text', placeholder: 'https://...' },
  {
    name: 'hidden',
    label: '표시 여부',
    type: 'select',
    default: '',
    options: [
      { value: '', label: '표시 (방문자에게 보임)' },
      { value: 'hidden', label: '숨김 (관리자에게만 보임)' },
    ],
    hint: '아직 공개하기 이른 소식은 "숨김"으로 두었다가 나중에 "표시"로 바꾸세요. 목록의 "숨기기/표시하기" 버튼으로도 바꿀 수 있습니다.',
  },
]

export const lablifeFields = () => [
  {
    name: 'images',
    label: '사진 (여러 장 함께 선택 가능)',
    type: 'image',
    folder: 'lablife',
    required: true,
    multiple: true,
    crop: true,
    cropField: 'imageCrops',
    cropAspect: [5, 4], // 실제 화면(갤러리 · 크게 보기)과 같은 5:4 비율
    hint: '사진을 누르면 위치와 확대를 조정할 수 있어요.',
  },
  { name: 'caption', label: '제목 · 한 줄 설명', type: 'text', placeholder: '예: 2026 가을 랩 세미나' },
  {
    name: 'body',
    label: '상세 설명 (선택)',
    type: 'textarea',
    rows: 4,
    hint: '여러 문장으로 자유롭게 적을 수 있어요.',
  },
  { name: 'date', label: '날짜', type: 'month', hint: '최신 날짜가 맨 앞에 나옵니다.' },
]

export const publicationFields = [
  { name: 'year', label: '연도', type: 'number', required: true },
  {
    name: 'type',
    label: '종류',
    type: 'select',
    default: 'journal',
    options: [
      { value: 'journal', label: 'Journal (학술지)' },
      { value: 'conference', label: 'Conference (학회 발표)' },
      { value: 'book', label: 'Book (저역서) — Publications에 연도별로 함께 표시' },
      { value: 'other', label: 'Thesis (학위논문) — Theses 탭에 표시' },
    ],
    hint: '학위논문은 "Thesis"를 선택하세요. Publications가 아니라 Theses 탭에 따로 모입니다.',
  },
  {
    name: 'authors',
    label: '저자 (저역서는 "지은이")',
    type: 'lines',
    rows: 3,
    hint: '한 줄에 한 명씩 (예: Lim, K. Y.). 저역서 중 번역서는 원저자를 여기에 적어주세요.',
  },
  {
    name: 'translators',
    label: '옮긴이 (저역서 · 번역서만 해당)',
    type: 'lines',
    rows: 2,
    hint: '이 책이 번역서일 때만 채워주세요. 채우면 목록에 "번역서" 표시가 붙습니다. 저서(직접 집필)는 비워두세요.',
  },
  {
    name: 'title',
    label: '제목',
    type: 'text',
    required: true,
    hint: '학위논문은 제목 맨 끝에 (석사학위논문) 또는 (박사학위논문)을 붙여주세요. 목록에서 제목과 분리되어 별도 배지로 표시됩니다. 예: "협력학습에서의 조절 전략 연구 (박사학위논문)"',
  },
  {
    name: 'venue',
    label: '학술지 / 학회명 / 출판사',
    type: 'text',
    hint: '학술지 이름을 정확히 적으면 SSCI·Scopus·KCI 배지가 자동으로 붙습니다. 저역서는 출판사를 적어주세요.',
  },
  {
    name: 'details',
    label: '권(호), 페이지',
    type: 'text',
    placeholder: '예: 32(1), 545-568',
    hint: '저역서는 총 쪽수를 적어주세요 (예: 372쪽).',
  },
  {
    name: 'bookRole',
    label: '저역서 표시 문구 (선택)',
    type: 'text',
    placeholder: '예: 저서 (챕터 저술)',
    hint: '비워두면 옮긴이가 있을 때 "번역서", 없을 때 "저서"로 자동 표시됩니다. 챕터만 집필한 책처럼 다르게 적고 싶을 때만 채우세요.',
    showIf: (v) => v.type === 'book',
  },
  {
    name: 'indexes',
    label: '등재 등급 (보통은 비워두세요)',
    type: 'text',
    placeholder: '예: SSCI, Scopus',
    hint: '비워두면 학술지 이름으로 자동 표시됩니다. 자동 표시가 틀렸을 때만 직접 적으세요 (SSCI / SCIE / Scopus / KCI, 쉼표로 구분). 적은 등급이 모두 나란히 배지로 붙습니다. 배지를 없애려면 - 만 입력.',
    showIf: (v) => v.type === 'journal',
  },
  {
    name: 'award',
    label: '수상 (선택)',
    type: 'text',
    placeholder: '예: 최우수논문상',
    hint: '학회 등에서 상을 받은 논문이면 상 이름을 적으세요. 목록에 상장 모양 배지로 표시됩니다.',
  },
  { name: 'doi', label: 'DOI (선택)', type: 'text', placeholder: '10.xxxx/xxxxx' },
  { name: 'link', label: '링크 (선택)', type: 'text', placeholder: 'https://...' },
]

export const projectFields = [
  { name: 'title', label: '과제명', type: 'text', required: true },
  { name: 'funder', label: '지원기관', type: 'text', placeholder: '예: 한국연구재단' },
  { name: 'start', label: '시작', type: 'month' },
  { name: 'end', label: '종료', type: 'month', hint: '비워두면 "진행 중"으로 표시됩니다.' },
  { name: 'description', label: '설명', type: 'textarea' },
]

export const patentFields = [
  { name: 'title', label: '특허명', type: 'text', required: true },
  { name: 'inventors', label: '발명자', type: 'lines', rows: 2, hint: '한 줄에 한 명씩' },
  { name: 'number', label: '출원/등록 번호', type: 'text' },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    default: 'pending',
    options: [
      { value: 'pending', label: '출원' },
      { value: 'registered', label: '등록' },
    ],
  },
  { name: 'date', label: '날짜', type: 'date' },
  { name: 'country', label: '국가', type: 'text', placeholder: '예: KR' },
  {
    name: 'hidden',
    label: '표시 여부',
    type: 'select',
    default: '',
    options: [
      { value: '', label: '표시 (방문자에게 보임)' },
      { value: 'hidden', label: '숨김 (관리자에게만 보임)' },
    ],
    hint: '등록이 아직 확정되지 않은 특허는 "숨김"으로 두었다가, 등록되면 "표시"로 바꾸세요. 목록의 "숨기기/표시하기" 버튼으로도 바꿀 수 있습니다.',
  },
]

export const toolFields = [
  { name: 'name', label: '이름', type: 'text', required: true },
  { name: 'description', label: '설명', type: 'textarea', rows: 3 },
  { name: 'image', label: '이미지', type: 'image', folder: 'tools' },
  { name: 'link', label: '링크 (선택)', type: 'text', placeholder: 'https://...' },
  { name: 'tags', label: '태그', type: 'tags', hint: '쉼표로 구분 (예: Learning Analytics, CSCL)' },
]

export const siteIntroFields = [
  { name: 'university', label: '상단 작은 글씨 (현재 미사용)', type: 'text' },
  { name: 'labName', label: '연구실 이름', type: 'text', required: true },
  {
    name: 'labTagline',
    label: '연구실 정식 이름 (영문)',
    type: 'text',
    placeholder: '예: Collaborative Research Learning Lab',
    hint: '메인 화면 인트로에서 이 이름이 세로로 쌓여 먼저 나타나고, 약자(연구실 이름)에 쓰이는 글자(Co · Re · Lab)만 남아 "CoRe Lab"으로 합쳐집니다. 약자의 글자가 이 이름의 단어 첫 부분(Co-llaborative, Re-search, Lab)에 있어야 모션이 됩니다.',
  },
  {
    name: 'mottoKr',
    label: '랩 모토 (한글)',
    type: 'text',
    placeholder: '예: 함께 배우는 과정을 들여다봅니다',
    hint: 'Lab Overview 위에 큰 글씨로 강조되어 표시됩니다.',
  },
  {
    name: 'mottoEn',
    label: '랩 모토 (영문)',
    type: 'text',
    placeholder: '예: Seeing How We Learn Together',
    hint: '메인 화면 인트로에서 "CoRe Lab"이 완성된 뒤 부제 아래에 표시되고, Lab Overview에서는 한글 모토 아래 함께 표시됩니다. 비워두면 메인 화면에서는 나오지 않습니다.',
  },
  {
    name: 'heroAffiliation',
    label: '히어로 하단 소속 문구 (영문)',
    type: 'lines',
    hint: '메인 화면에서 "CoRe Lab"과 모토 아래에 순서대로 표시됩니다. 한 줄에 하나씩 입력하세요. 1번째 줄 = 대학교(작게), 2번째 줄 = 학과(가장 또렷하게 강조), 3번째 줄부터 = 지도교수 등(작게). 예: Ewha Womans University / Department of Educational Technology / Prof. Kyu Yon Lim',
  },
  { name: 'overview', label: '소개글', type: 'paragraphs', rows: 8, hint: '문단 사이는 빈 줄 하나로 구분하세요.' },
  { name: 'researchAreas', label: '연구 분야 태그', type: 'lines', hint: '한 줄에 하나씩' },
]

export const contactFields = [
  { name: 'address', label: '주소', type: 'text' },
  { name: 'email', label: '이메일', type: 'text' },
  { name: 'phone', label: '전화번호', type: 'text' },
]
