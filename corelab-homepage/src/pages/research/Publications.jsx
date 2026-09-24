import { useEffect, useMemo, useRef, useState } from 'react'
import { EditButton } from '../../components/admin/AdminControls'
import { getIndexes } from './journalIndex'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'journal', label: 'Journal' },
  { key: 'conference', label: 'Conference' },
  { key: 'other', label: 'Thesis' },
]

/** 제목 끝의 "(석사학위논문)" 같은 꼬리표를 떼어 배지로 보여줍니다. */
function splitThesis(title = '') {
  const m = title.match(/\s*\((석사|박사)학위\s*논문\)\s*$/)
  if (!m) return { title, thesis: null }
  return { title: title.slice(0, m.index), thesis: `${m[1]}학위논문` }
}

/** 검색어를 공백으로 나눠 단어 목록으로 (모든 단어가 들어간 논문만 남깁니다). */
function toTerms(query) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 검색어와 일치하는 부분만 은은하게 표시합니다. */
function Highlight({ text = '', terms }) {
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

function Authors({ authors = [], terms }) {
  if (!authors.length) return null
  return (
    <p className="pub-authors">
      <Highlight text={authors.join(', ')} terms={terms} />
    </p>
  )
}

function SearchBox({ value, onChange }) {
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
        placeholder="제목, 저자, 학술지 검색"
        aria-label="논문 검색"
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

function PubItem({ pub, onEdit, terms }) {
  const indexes = getIndexes(pub)
  const { title, thesis } = pub.type === 'other' ? splitThesis(pub.title) : { title: pub.title, thesis: null }
  const typeTag =
    pub.type === 'conference' ? 'Conference' : pub.type === 'other' ? thesis ?? 'Other' : null
  const typeTagClass =
    thesis === '박사학위논문' ? ' pub-type-tag-phd' : thesis === '석사학위논문' ? ' pub-type-tag-ma' : ''

  return (
    <li className="pub-item admin-item">
      <EditButton onClick={() => onEdit(pub)} />
      <p className="pub-title">
        {pub.link ? (
          <a href={pub.link} target="_blank" rel="noreferrer">
            <Highlight text={title} terms={terms} />
          </a>
        ) : (
          <Highlight text={title} terms={terms} />
        )}
      </p>
      <Authors authors={pub.authors} terms={terms} />
      <div className="pub-meta">
        {pub.venue && (
          <span className="pub-venue">
            <Highlight text={pub.venue} terms={terms} />
            {pub.details ? <span className="pub-details">, {pub.details}</span> : null}
          </span>
        )}
        {typeTag && <span className={`pub-type-tag${typeTagClass}`}>{typeTag}</span>}
        <IndexBadges indexes={indexes} />
        {pub.doi && (
          <a className="pub-doi" href={`https://doi.org/${pub.doi}`} target="_blank" rel="noreferrer">
            DOI
          </a>
        )}
      </div>
    </li>
  )
}

export default function Publications({ items = [], onEdit, initialQuery = '' }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState(initialQuery)
  const terms = useMemo(() => toTerms(query), [query])

  // People 페이지의 "이 사람 논문 보기" 링크(#/research?tab=publications&q=이름)로 들어왔을 때,
  // 검색어를 새로 반영합니다.
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // 저역서(book)는 Books 탭에서 따로 보여줍니다.
  const pubs = useMemo(() => items.filter((p) => p.type !== 'book'), [items])

  const stats = useMemo(() => {
    const journals = pubs.filter((p) => p.type === 'journal')
    const has = (ix) => journals.filter((p) => getIndexes(p).includes(ix)).length
    return {
      journals: journals.length,
      ssci: journals.filter((p) => getIndexes(p).some((i) => i === 'SSCI' || i === 'SCIE')).length,
      scopus: has('Scopus'),
      kci: has('KCI'),
      conferences: pubs.filter((p) => p.type === 'conference').length,
      theses: pubs.filter((p) => p.type === 'other').length,
    }
  }, [pubs])

  const filtered = useMemo(
    () =>
      pubs.filter((p) => {
        if (filter !== 'all' && p.type !== filter) return false
        if (!terms.length) return true
        const hay = [p.title, (p.authors ?? []).join(' '), p.venue, p.year].join(' ').toLowerCase()
        return terms.every((t) => hay.includes(t))
      }),
    [pubs, filter, terms],
  )

  const byYear = useMemo(() => {
    const groups = {}
    filtered.forEach((pub) => {
      const y = pub.year ?? '기타'
      if (!groups[y]) groups[y] = []
      groups[y].push(pub)
    })
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]))
  }, [filtered])

  if (pubs.length === 0) return <p className="empty-state">등록된 논문이 없습니다.</p>

  const presentTypes = new Set(pubs.map((p) => p.type))

  return (
    <div className="pubs">
      <dl className="pub-stats">
        <div>
          <dt>Journal Articles</dt>
          <dd>{stats.journals}</dd>
        </div>
        <div>
          <dt>SSCI · SCIE</dt>
          <dd>{stats.ssci}</dd>
        </div>
        <div>
          <dt>Scopus</dt>
          <dd>{stats.scopus}</dd>
        </div>
        <div>
          <dt>KCI</dt>
          <dd>{stats.kci}</dd>
        </div>
        <div>
          <dt>Conferences</dt>
          <dd>{stats.conferences}</dd>
        </div>
        <div>
          <dt>Theses</dt>
          <dd>{stats.theses}</dd>
        </div>
      </dl>

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

      {byYear.map(([year, list]) => (
        <section key={year} className="pub-year-group">
          <h3 className="pub-year-title">
            {year}
            <span className="pub-year-count">{list.length}편</span>
          </h3>
          <ul className="pub-list">
            {list.map((pub) => (
              <PubItem key={pub.id} pub={pub} onEdit={onEdit} terms={terms} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
