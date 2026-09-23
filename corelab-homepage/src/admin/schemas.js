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
    hint: '자유롭게 이력서처럼 작성하세요. 소제목으로 쓰고 싶은 줄은 맨 앞에 #을 붙이세요 (예: #학력). # 없이 쓴 줄은 그 소제목 아래 내용으로 보여집니다.',
    rows: 8,
    showIf: (v) => v.category !== 'faculty',
  },
  {
    name: 'links',
    label: '포트폴리오 · 관련 링크 (선택)',
    type: 'linklines',
    hint: '한 줄에 하나씩, "표시할 글자 | 링크" 순서로 적으세요. 예: Google Scholar | https://scholar.google.com/citations?...',
    rows: 3,
    showIf: (v) => v.category === 'students' || v.category === 'alumni',
  },
]

export const newsFields = [
  { name: 'title', label: '제목', type: 'text', required: true },
  { name: 'images', label: '사진 (여러 장 함께 선택 가능)', type: 'image', folder: 'news', multiple: true },
  {
    name: 'imageSize',
    label: '대표 사진 크기',
    type: 'select',
    default: 'medium',
    options: [
      { value: 'small', label: '작게' },
      { value: 'medium', label: '보통' },
      { value: 'large', label: '크게' },
      { value: 'full', label: '전체 너비' },
    ],
    hint: '맨 위에 나오는 첫 번째 사진의 크기입니다.',
  },
  {
    name: 'body',
    label: '내용',
    type: 'paragraphs',
    rows: 10,
    hint: '기사처럼 자유롭게 적으세요. 문단 사이는 빈 줄로 구분하면 됩니다. 사진을 본문 중간에 넣고 싶으면, 넣고 싶은 위치에 [사진2], [사진3]처럼 한 줄만 따로 적으세요 (숫자는 위에서 선택한 사진 순서, 첫 번째 사진은 이미 대표 사진으로 맨 위에 쓰이니 2번째부터 씁니다). 아무 표시도 안 하면 남은 사진은 글 맨 아래에 모아서 보여줍니다.',
  },
  { name: 'link', label: '관련 링크 (선택)', type: 'text', placeholder: 'https://...' },
]

export const lablifeFields = () => [
  {
    name: 'images',
    label: '사진 (여러 장 함께 선택 가능)',
    type: 'image',
    folder: 'lablife',
    required: true,
    multiple: true,
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
      { value: 'book', label: 'Book (저서)' },
      { value: 'other', label: 'Other (기타)' },
    ],
  },
  { name: 'authors', label: '저자', type: 'lines', rows: 3, hint: '한 줄에 한 명씩 (예: Lim, K.)', required: true },
  { name: 'title', label: '제목', type: 'text', required: true },
  { name: 'venue', label: '학술지 / 학회명', type: 'text' },
  { name: 'details', label: '권(호), 페이지', type: 'text', placeholder: '예: 212, 105001' },
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
]

export const toolFields = [
  { name: 'name', label: '이름', type: 'text', required: true },
  { name: 'description', label: '설명', type: 'textarea', rows: 3 },
  { name: 'image', label: '이미지', type: 'image', folder: 'tools' },
  { name: 'link', label: '링크 (선택)', type: 'text', placeholder: 'https://...' },
  { name: 'tags', label: '태그', type: 'tags', hint: '쉼표로 구분 (예: Learning Analytics, CSCL)' },
]

export const siteIntroFields = [
  {
    name: 'heroImage',
    label: '메인 화면 사진',
    type: 'image',
    folder: 'site',
    hint: '랩 단체사진 등 가로로 넓은 사진을 추천해요. 비워두면 사진 없이 지금처럼 텍스트만 나옵니다.',
  },
  { name: 'university', label: '상단 작은 글씨', type: 'text' },
  { name: 'labName', label: '연구실 이름', type: 'text', required: true },
  { name: 'labTagline', label: '부제 (사진 위 태그라인으로도 쓰입니다)', type: 'text' },
  { name: 'overview', label: '소개글', type: 'paragraphs', rows: 8, hint: '문단 사이는 빈 줄 하나로 구분하세요.' },
  { name: 'researchAreas', label: '연구 분야 태그', type: 'lines', hint: '한 줄에 하나씩' },
]

export const contactFields = [
  { name: 'address', label: '주소', type: 'text' },
  { name: 'email', label: '이메일', type: 'text' },
  { name: 'phone', label: '전화번호', type: 'text' },
]
