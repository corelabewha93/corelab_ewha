import { useMemo, useState } from 'react'
import { splitThesis, toTerms, groupByYear, YearGroups, SearchBox, searchText } from './Publications'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: '박사학위논문', label: 'Ph.D.' },
  { key: '석사학위논문', label: 'M.A.' },
]

/**
 * Theses — 연구실에서 나온 석·박사 학위논문.
 * research.json의 publications 중 type이 'other'인 항목을 연도별로 보여줍니다.
 * (제목 끝의 "(석사학위논문)" / "(박사학위논문)" 표시로 석·박사를 구분합니다.)
 */
export default function Theses({ items = [], onEdit, embedded = false, focus = null }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const terms = useMemo(() => toTerms(query), [query])

  const theses = useMemo(() => items.filter((p) => p.type === 'other'), [items])

  const stats = useMemo(() => {
    const kind = (p) => splitThesis(p.title).thesis
    return {
      total: theses.length,
      phd: theses.filter((p) => kind(p) === '박사학위논문').length,
      ma: theses.filter((p) => kind(p) === '석사학위논문').length,
    }
  }, [theses])

  const filtered = useMemo(
    () =>
      theses.filter((p) => {
        if (filter !== 'all' && splitThesis(p.title).thesis !== filter) return false
        if (!terms.length) return true
        const hay = searchText(p)
        return terms.every((t) => hay.includes(t))
      }),
    [theses, filter, terms],
  )

  const byYear = useMemo(() => groupByYear(filtered), [filtered])

  if (theses.length === 0) return <p className="empty-state">등록된 학위논문이 없습니다.</p>

  return (
    <div className="pubs">
      {!embedded && (
        <dl className="pub-stats pub-stats-theses">
          <div>
            <dt>Theses</dt>
            <dd>{stats.total}</dd>
          </div>
          <div>
            <dt>Ph.D.</dt>
            <dd>{stats.phd}</dd>
          </div>
          <div>
            <dt>M.A.</dt>
            <dd>{stats.ma}</dd>
          </div>
        </dl>
      )}

      {!embedded && (
        <div className="pub-toolbar">
          <div className="filter-row">
            {FILTERS.map((f) => (
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
          <SearchBox value={query} onChange={setQuery} placeholder="제목, 저자 검색" />
        </div>
      )}

      {terms.length > 0 && (
        <p className="pub-search-summary" aria-live="polite">
          <strong>‘{query.trim()}’</strong> 검색 결과 {filtered.length}편
        </p>
      )}

      {byYear.length === 0 && (
        <p className="empty-state">
          {terms.length ? '검색어와 일치하는 학위논문이 없습니다.' : '해당하는 학위논문이 없습니다.'}
        </p>
      )}

      <YearGroups groups={byYear} onEdit={onEdit} terms={terms} focus={focus} />
    </div>
  )
}
