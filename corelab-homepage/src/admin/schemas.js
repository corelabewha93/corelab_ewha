/**
 * 관리자 입력창에 나오는 항목들. 항목을 추가/삭제하고 싶으면 여기만 고치면 됩니다.
 */

export const DEGREE_OPTIONS = [
  { value: 'PhD', label: 'PhD (박사)' },
  { value: 'MA', label: 'MA (석사)' },
  { value: 'BA', label: 'BA (학부연구생)' },
]

const DETAIL_HINT = '한 줄에 한 항목씩 적으세요. 이름/사진을 누르면 펼쳐지는 내용입니다.'

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
    showIf: (v) => v.category === 'students',
  },
  {
    name: 'affiliation',
    label: '소속',
    type: 'text',
    placeholder: '예: 이화여자대학교 교육공학과',
    showIf: (v) => v.category !== 'alumni',
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
    label: '한 줄 소개',
    type: 'text',
    showIf: (v) => v.category !== 'alumni',
  },
  { name: 'detail', label: '상세 이력', type: 'lines', hint: DETAIL_HINT, rows: 5 },
]

export const newsFields = [
  { name: 'title', label: '제목', type: 'text', required: true },
  { name: 'date', label: '날짜', type: 'date', required: true },
  { name: 'thumbnail', label: '대표 사진', type: 'image', folder: 'news' },
  { name: 'summary', label: '내용 요약', type: 'textarea', rows: 4 },
  { name: 'link', label: '관련 링크 (선택)', type: 'text', placeholder: 'https://...' },
]

export const lablifeFields = (isNew) => [
  {
    name: 'image',
    label: isNew ? '사진 (여러 장 한 번에 선택 가능)' : '사진',
    type: 'image',
    folder: 'lablife',
    required: true,
    multiple: isNew,
  },
  { name: 'caption', label: '설명', type: 'text', placeholder: '예: 2026 가을 랩 세미나' },
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
  { name: 'university', label: '상단 작은 글씨', type: 'text' },
  { name: 'labName', label: '연구실 이름', type: 'text', required: true },
  { name: 'labTagline', label: '부제', type: 'text' },
  { name: 'overview', label: '소개글', type: 'paragraphs', rows: 8, hint: '문단 사이는 빈 줄 하나로 구분하세요.' },
  { name: 'researchAreas', label: '연구 분야 태그', type: 'lines', hint: '한 줄에 하나씩' },
]

export const contactFields = [
  { name: 'address', label: '주소', type: 'text' },
  { name: 'email', label: '이메일', type: 'text' },
  { name: 'phone', label: '전화번호', type: 'text' },
]
