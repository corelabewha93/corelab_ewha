import { useMemo, useState } from 'react'
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

function Authors({ authors = [] }) {
  if (!authors.length) return null
  return <p className="pub-authors">{authors.join(', ')}</p>
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

function PubItem({ pub, onEdit }) {
  const indexes = getIndexes(pub)
  const { title, thesis } = pub.type === 'other' ? splitThesis(pub.title) : { title: pub.title, thesis: null }
  const typeTag =
    pub.type === 'conference' ? 'Conference' : pub.type === 'other' ? thesis ?? 'Other' : null

  return (
    <li className="pub-item admin-item">
      <EditButton onClick={() => onEdit(pub)} />
      <p className="pub-title">
        {pub.link ? (
          <a href={pub.link} target="_blank" rel="noreferrer">
            {title}
          </a>
        ) : (
          title
        )}
      </p>
      <Authors authors={pub.authors} />
      <div className="pub-meta">
        {pub.venue && (
          <span className="pub-venue">
            {pub.venue}
            {pub.details ? <span className="pub-details">, {pub.details}</span> : null}
          </span>
        )}
        {typeTag && <span className="pub-type-tag">{typeTag}</span>}
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

export default function Publications({ items = [], onEdit }) {
  const [filter, setFilter] = useState('all')

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
      pubs.filter((p) => filter === 'all' || p.type === filter),
    [pubs, filter],
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
      </div>

      {byYear.length === 0 && <p className="empty-state">해당하는 논문이 없습니다.</p>}

      {byYear.map(([year, list]) => (
        <section key={year} className="pub-year-group">
          <h3 className="pub-year-title">
            {year}
            <span className="pub-year-count">{list.length}편</span>
          </h3>
          <ul className="pub-list">
            {list.map((pub) => (
              <PubItem key={pub.id} pub={pub} onEdit={onEdit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
