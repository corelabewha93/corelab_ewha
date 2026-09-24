/**
 * 학술지 이름 → 등재 등급(SSCI / SCIE / Scopus / KCI) 자동 표시표.
 *
 * - 논문 데이터(research.json)는 건드리지 않고, 학술지 이름만 보고 배지를 붙입니다.
 * - 띄어쓰기·대소문자·기호(&, and, ·)가 조금 달라도 같은 학술지로 인식합니다.
 * - 여기 없는 학술지(학회 발표, 학위논문 등)에는 배지가 붙지 않습니다.
 * - 개별 논문에서 직접 바꾸고 싶으면 관리자 화면의 "등재 등급" 칸에 적으면
 *   이 표보다 우선합니다. (예: "SSCI, Scopus" / 배지를 없애려면 "-")
 *
 * 기준: 이화여대 교수 연구실적 페이지 표기 + 각 학술지 공식 색인 정보.
 */
const INDEX_TABLE = [
  // ---- International ----
  { names: ['Computers & Education', 'Computers and Education'], indexes: ['SSCI', 'SCIE', 'Scopus'] },
  { names: ['British Journal of Educational Technology'], indexes: ['SSCI', 'Scopus'] },
  { names: ['Learning and Instruction'], indexes: ['SSCI', 'Scopus'] },
  {
    names: ['Australasian Journal of Educational Technology', 'Australian Journal of Educational Technology'],
    indexes: ['SSCI', 'Scopus'],
  },
  { names: ['Educational Technology & Society', 'Educational Technology and Society'], indexes: ['SSCI', 'Scopus'] },
  { names: ['International Journal of Educational Research'], indexes: ['SSCI', 'Scopus'] },
  { names: ['Asia-Pacific Education Researcher', 'The Asia-Pacific Education Researcher'], indexes: ['SSCI', 'Scopus'] },
  { names: ['Journal of Interactive Learning Research'], indexes: ['Scopus'] },
  { names: ['Issues in Educational Research'], indexes: ['Scopus'] },
  { names: ['Educational Technology International'], indexes: ['KCI'] },

  // ---- 국내 KCI ----
  {
    names: [
      '교육정보미디어연구',
      '교육공학연구',
      '교육방법연구',
      '학습자중심교과교육연구',
      '학습자중심교과교육연구연구',
      '컴퓨터교육학회 논문지',
      '컴퓨터교육학회논문지',
      '교육과학연구',
      '기업교육과인재연구',
      '기업교육연구',
      '敎員敎育',
      '교원교육',
      '한국교원교육연구',
      '교육문화연구',
      '미래교육학연구',
      '체육과학연구',
      '디지털융복합연구',
      '교육의이론과실천',
    ],
    indexes: ['KCI'],
  },
]

/** 비교용: 소문자 + 'and' → '&' + 공백/기호 제거 */
function normalize(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/^the\s+/, '')
    .replace(/[\s·.,:;'"()\-_/]+/g, '')
}

const LOOKUP = new Map()
INDEX_TABLE.forEach(({ names, indexes }) => names.forEach((n) => LOOKUP.set(normalize(n), indexes)))

/** 표시 순서 (높은 등급부터) */
export const INDEX_ORDER = ['SSCI', 'SCIE', 'Scopus', 'KCI']
export const INTERNATIONAL = new Set(['SSCI', 'SCIE', 'Scopus'])

export function getIndexes(pub) {
  if (!pub) return []
  const manual = typeof pub.indexes === 'string' ? pub.indexes.trim() : ''
  if (manual === '-') return []
  if (manual) {
    const wanted = manual.split(/[,\s/]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
    return INDEX_ORDER.filter((idx) => wanted.includes(idx.toLowerCase()))
  }
  if (pub.type !== 'journal') return []
  return LOOKUP.get(normalize(pub.venue)) ?? []
}

export function isInternational(pub) {
  return getIndexes(pub).some((i) => INTERNATIONAL.has(i))
}
