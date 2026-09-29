import { useMemo, useRef, useState } from 'react'
import { EditButton } from '../../components/admin/AdminControls'
import { getIndexes, INTERNATIONAL } from './journalIndex'
import { normalizeName } from './authorMatch'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'journal', label: 'Journal' },
  { key: 'conference', label: 'Conference' },
  { key: 'book', label: 'Book' },
]

/** 제목 끝의 "(석사학위논문)" 같은 꼬리표를 떼어 배지로 보여줍니다. */
export function splitThesis(title = '') {
  const m = title.match(/\s*\((석사|박사)학위\s*논문\)\s*$/)
  if (!m) return { title, thesis: null }
  return { title: title.slice(0, m.index), thesis: `${m[1]}학위논문` }
}

/** 검색어를 공백으로 나눠 단어 목록으로 (모든 단어가 들어간 논문만 남깁니다). */
export function toTerms(query) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 검색어와 일치하는 부분만 은은하게 표시합니다. */
export function Highlight({ text = '', terms }) {
  if (!terms.length || !text) return text
  const re = new RegExp(`(${terms.map(escapeRe).join('|')})`, 'gi')
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="pub-hl">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function NameList({ names = [], terms, focus }) {
  return names.map((a, i) => (
    <span key={i}>
      {i > 0 && ', '}
      {focus?.has(normalizeName(a)) ? (
        <mark className="pub-hl-author">{a}</mark>
      ) : (
        <Highlight text={a} terms={terms} />
      )}
    </span>
  ))
}

function Authors({ authors = [], translators = [], terms, focus }) {
  const isTranslation = translators.length > 0
  if (!authors.length && !translators.length) return null
  return (
    <p className="pub-authors">
      {isTranslation && authors.length > 0 && <span className="pub-role-label">지은이</span>}
      <NameList names={authors} terms={terms} focus={focus} />
      {isTranslation && (
        <>
          <span className="pub-role-sep"> · </span>
          <span className="pub-role-label">옮긴이</span>
          <NameList names={translators} terms={terms} focus={focus} />
        </>
      )}
    </p>
  )
}

export function SearchBox({ value, onChange, placeholder = '제목, 저자, 학술지 검색' }) {
  const inputRef = useRef(null)
  return (
    <div className={`pub-search${value ? ' has-value' : ''}`} role="search">
      <svg className="pub-search-icon" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l4.25 4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="pub-search-input"
        placeholder={placeholder}
        aria-label="검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onChange('')}
      />
      {value && (
        <button
          type="button"
          className="pub-search-clear"
          aria-label="검색어 지우기"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

/** 등재 등급 배지 — 해당하는 등급을 모두 나란히 (예: SSCI · SCIE · Scopus) */
function IndexBadges({ indexes }) {
  if (!indexes.length) return null
  return (
    <span className="pub-index-badges">
      {indexes.map((ix) => (
        <span key={ix} className={`pub-index pub-index-${ix.toLowerCase()}`}>
          {ix}
        </span>
      ))}
    </span>
  )
}

/**
 * 수상 배지 — 상장 모양 아이콘 + 상 이름.
 * org(수여 기관)를 함께 적으면 상 이름 옆에 가는 선으로 구분해 기관이 붙고, 배지는 청록색이 됩니다.
 * org가 없으면 예전처럼 금색 배지 하나로 보입니다. (박사학위논문 태그의 금색과는 별개입니다.)
 */
export function AwardBadge({ award, org = '' }) {
  if (!award) return null
  const orgText = (org ?? '').trim()
  const kind = orgText ? ' pub-award-org-badge' : ''
  return (
    <span className={`pub-award${kind}`} title={orgText ? `${orgText} 수여` : '수상'}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          d="M4.5 1.5h7l-.9 6.2a2.6 2.6 0 0 1-5.2 0z"
          fill="currentColor"
          opacity="0.28"
        />
        <path
          d="M4.5 1.5h7l-.9 6.2a2.6 2.6 0 0 1-5.2 0zM3.2 3H1.6a.6.6 0 0 0-.6.6c0 1.9 1.1 3 2.5 3.2M12.8 3h1.6a.6.6 0 0 1 .6.6c0 1.9-1.1 3-2.5 3.2M8 10.2v2.3M5.6 14.5h4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {award}
      {orgText && <span className="pub-award-org">{orgText}</span>}
    </span>
  )
}

/** 저역서 종류 배지 문구: 직접 적은 문구(bookRole) > 옮긴이 있으면 번역서 > 저서 */
function bookRoleOf(pub) {
  if (pub.bookRole?.trim()) return pub.bookRole.trim()
  return (pub.translators?.length ?? 0) > 0 ? '번역서' : '저서'
}

/** 쪽수 등 세부 정보에 "절판"·"품절" 같은 판매 상태가 섞여 있으면 빼고 보여줍니다. */
function stripSaleStatus(text = '') {
  return text
    .split('·')
    .map((part) => part.replace(/\(?\s*(절판|품절)\s*\)?/g, '').trim())
    .filter(Boolean)
    .join(' · ')
}

export function PubItem({ pub, onEdit, terms = [], focus = null, authorTool = null }) {
  const isBook = pub.type === 'book'
  const { title, thesis } = pub.type === 'other' ? splitThesis(pub.title) : { title: pub.title, thesis: null }

  let typeTag = null
  let typeTagClass = ''
  if (pub.type === 'conference') typeTag = 'Conference'
  else if (pub.type === 'other') {
    typeTag = thesis ?? 'Other'
    typeTagClass = thesis === '박사학위논문' ? ' pub-type-tag-phd' : thesis === '석사학위논문' ? ' pub-type-tag-ma' : ''
  } else if (isBook) {
    typeTag = bookRoleOf(pub)
    // 저서(초록) / 번역서(회색)를 색으로 구분합니다.
    typeTagClass = (pub.translators?.length ?? 0) > 0 ? ' pub-type-tag-translation' : ' pub-type-tag-book'
  }

  const details = isBook ? stripSaleStatus(pub.details) : pub.details

  return (
    <li className={`pub-item admin-item${authorTool?.excluded ? ' pub-item-excluded' : ''}`}>
      <EditButton onClick={() => onEdit(pub)} />
      {authorTool && (
        <button
          type="button"
          className={`pub-exclude-btn${authorTool.excluded ? ' is-excluded' : ''}`}
          onClick={authorTool.onToggle}
          title={
            authorTool.excluded
              ? `${authorTool.name}의 연구 실적에 다시 포함합니다`
              : `동명이인 등 ${authorTool.name}의 실적이 아닐 때, 이 사람의 모아보기에서만 뺍니다 (전체 논문 목록에는 그대로 남아요)`
          }
        >
          {authorTool.excluded ? '다시 포함' : '내 실적 아님'}
        </button>
      )}
      <p className="pub-title">
        {pub.link ? (
          <a href={pub.link} target="_blank" rel="noreferrer">
            <Highlight text={title} terms={terms} />
          </a>
        ) : (
          <Highlight text={title} terms={terms} />
        )}
      </p>
      <Authors authors={pub.authors} translators={isBook ? pub.translators : []} terms={terms} focus={focus} />
      <div className="pub-meta">
        {pub.venue && (
          <span className="pub-venue">
            <Highlight text={pub.venue} terms={terms} />
            {details ? <span className="pub-details">, {details}</span> : null}
          </span>
        )}
        {typeTag && <span className={`pub-type-tag${typeTagClass}`}>{typeTag}</span>}
        <IndexBadges indexes={getIndexes(pub)} />
        <AwardBadge award={pub.award} org={pub.awardOrg} />
        {authorTool?.excluded && (
          <span className="badge badge-hidden">{authorTool.name} 실적에서 제외됨 · 관리자에게만 보임</span>
        )}
        {pub.doi && (
          <a className="pub-doi" href={`https://doi.org/${pub.doi}`} target="_blank" rel="noreferrer">
            DOI
          </a>
        )}
      </div>
    </li>
  )
}

/** 연도별로 묶어서 (최신 연도부터) 돌려줍니다. */
export function groupByYear(list) {
  const groups = {}
  list.forEach((pub) => {
    const y = pub.year ?? '기타'
    if (!groups[y]) groups[y] = []
    groups[y].push(pub)
  })
  return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]))
}

export function YearGroups({ groups, onEdit, terms = [], focus = null, authorTool = null }) {
  return groups.map(([year, list]) => (
    <section key={year} className="pub-year-group">
      <h3 className="pub-year-title">{year}</h3>
      <ul className="pub-list">
        {list.map((pub) => (
          <PubItem
            key={pub.id}
            pub={pub}
            onEdit={onEdit}
            terms={terms}
            focus={focus}
            authorTool={
              authorTool
                ? {
                    name: authorTool.name,
                    excluded: authorTool.isExcluded(pub),
                    onToggle: () => authorTool.onToggle(pub),
                  }
                : null
            }
          />
        ))}
      </ul>
    </section>
  ))
}

/** 검색용 문자열 */
export function searchText(p) {
  return [p.title, (p.authors ?? []).join(' '), (p.translators ?? []).join(' '), p.venue, p.year, p.award]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Publications — 학술지 논문 · 학회 발표 · 저역서를 연도별로 한 목록에 보여줍니다.
 * (학위논문은 Theses 탭에서 따로 보여줍니다.)
 *
 * embedded: "OOO의 연구 실적" 화면 안에 들어갈 때 — 상단 연구실 전체 통계를 숨깁니다.
 * focus: 모아보기 중인 사람 이름(비교용 Set). 저자 목록에서 그 이름만 초록색으로 표시합니다.
 */
export default function Publications({
  items = [],
  onEdit,
  initialQuery = '',
  embedded = false,
  focus = null,
  authorTool = null,
}) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState(initialQuery)
  const terms = useMemo(() => toTerms(query), [query])

  // 검색어가 주소에서 바뀌면 Research.jsx가 key를 바꿔 이 컴포넌트를 새로 그리므로
  // 필터와 검색칸은 자연스럽게 처음 상태로 돌아갑니다.

  // 학위논문(other)은 Theses 탭에서 따로 보여줍니다.
  const pubs = useMemo(() => items.filter((p) => p.type !== 'other'), [items])

  // 상단 통계: 학술지 논문을 "International(Scopus 이상, SSCI 포함)"과 "KCI"로 겹치지 않게 나눠 셉니다.
  // (SSCI 학술지는 Scopus에도 들어가므로 따로따로 세면 실적이 부풀려 보입니다.)
  const stats = useMemo(() => {
    const journals = pubs.filter((p) => p.type === 'journal')
    const isIntl = (p) => getIndexes(p).some((i) => INTERNATIONAL.has(i))
    const intl = journals.filter(isIntl)
    return {
      journals: journals.length,
      international: intl.length,
      ssci: intl.filter((p) => getIndexes(p).includes('SSCI')).length,
      kci: journals.filter((p) => !isIntl(p)).length,
      conferences: pubs.filter((p) => p.type === 'conference').length,
      books: pubs.filter((p) => p.type === 'book').length,
    }
  }, [pubs])

  const filtered = useMemo(
    () =>
      pubs.filter((p) => {
        if (filter !== 'all' && p.type !== filter) return false
        if (!terms.length) return true
        const hay = searchText(p)
        return terms.every((t) => hay.includes(t))
      }),
    [pubs, filter, terms],
  )

  const byYear = useMemo(() => groupByYear(filtered), [filtered])

  if (pubs.length === 0) return <p className="empty-state">등록된 논문이 없습니다.</p>

  const presentTypes = new Set(pubs.map((p) => p.type))
  return (
    <div className="pubs">
      {!embedded && (
        <dl className="pub-stats">
          <div>
            <dt>Journal Articles</dt>
            <dd>{stats.journals}</dd>
          </div>
          <div>
            <dt>KCI</dt>
            <dd>{stats.kci}</dd>
          </div>
          <div>
            <dt>International</dt>
            <dd>
              {stats.international}
              {stats.ssci > 0 && <small className="pub-stats-sub">SSCI {stats.ssci}</small>}
            </dd>
          </div>
          <div>
            <dt>Conferences</dt>
            <dd>{stats.conferences}</dd>
          </div>
          <div>
            <dt>Books</dt>
            <dd>{stats.books}</dd>
          </div>
        </dl>
      )}

      {pubs.length > 0 && (
        <div className="pub-toolbar">
          <div className="filter-row">
            {FILTERS.filter((f) => f.key === 'all' || presentTypes.has(f.key)).map((f) => (
              <button
                key={f.key}
                type="button"
                className={`filter-chip${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} />
        </div>
      )}

      {terms.length > 0 && (
        <p className="pub-search-summary" aria-live="polite">
          <strong>‘{query.trim()}’</strong> 검색 결과 {filtered.length}편
        </p>
      )}

      {byYear.length === 0 && (
        <p className="empty-state">
          {terms.length ? '검색어와 일치하는 논문이 없습니다.' : '해당하는 논문이 없습니다.'}
        </p>
      )}

      <YearGroups groups={byYear} onEdit={onEdit} terms={terms} focus={focus} authorTool={authorTool} />
    </div>
  )
}
