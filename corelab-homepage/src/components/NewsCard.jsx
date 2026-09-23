import SafeImage from './SafeImage'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function NewsCard({ item }) {
  const content = (
    <article className="card news-card">
      <div className="thumb">
        <SafeImage
          src={item.thumbnail}
          alt=""
          fallback={<span className="muted" style={{ padding: '1rem', display: 'block' }} />}
        />
      </div>
      <div className="body">
        <div className="date">{formatDate(item.date)}</div>
        <h3 className="title">{item.title}</h3>
        {item.summary && <p className="summary">{item.summary}</p>}
      </div>
    </article>
  )

  if (item.link) {
    return (
      <a href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </a>
    )
  }

  return content
}
