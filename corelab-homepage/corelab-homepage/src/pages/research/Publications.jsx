import { useMemo, useState } from 'react'
import { EditButton } from '../../components/admin/AdminControls'

const TYPE_LABELS = {
  journal: 'Journal',
  conference: 'Conference',
  book: 'Book',
  other: 'Other',
}

export default function Publications({ items = [], onEdit }) {
  const [filter, setFilter] = useState('all')

  const types = useMemo(() => {
    const present = new Set(items.map((p) => p.type))
    return Object.keys(TYPE_LABELS).filter((t) => present.has(t))
  }, [items])

  const filtered = filter === 'all' ? items : items.filter((p) => p.type === filter)

  const byYear = useMemo(() => {
    const groups = {}
    filtered.forEach((pub) => {
      const y = pub.year ?? '기타'
      if (!groups[y]) groups[y] = []
      groups[y].push(pub)
    })
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]))
  }, [filtered])

  if (items.length === 0) return <p className="empty-state">등록된 논문이 없습니다.</p>

  return (
    <div>
      {types.length > 1 && (
        <div className="filter-row">
          <button
            className={`filter-chip${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              className={`filter-chip${filter === t ? ' active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {byYear.map(([year, pubs]) => (
        <div key={year} className="pub-year-group">
          <h3 className="pub-year-title">{year}</h3>
          {pubs.map((pub) => (
            <div key={pub.id} className="pub-item admin-item">
              <EditButton onClick={() => onEdit(pub)} />
              <div className="pub-authors">
                {(pub.authors ?? []).join(', ')}
                {pub.type && <span className="badge">{TYPE_LABELS[pub.type] ?? pub.type}</span>}
              </div>
              <p className="pub-title">
                {pub.link ? (
                  <a href={pub.link} target="_blank" rel="noreferrer">
                    {pub.title}
                  </a>
                ) : (
                  pub.title
                )}
              </p>
              <div className="pub-venue">
                {pub.venue}
                {pub.details ? `, ${pub.details}` : ''}
              </div>
              {pub.doi && (
                <a
                  href={`https://doi.org/${pub.doi}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.82rem' }}
                >
                  doi:{pub.doi}
                </a>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
