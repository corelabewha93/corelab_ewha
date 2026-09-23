import SafeImage from './SafeImage'
import { useAdminAuth } from '../admin/AdminAuthContext'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 날짜는 정렬용으로만 쓰고, 일반 방문자에게는 보여주지 않습니다 (관리자에게만 표시).
export default function NewsCard({ item }) {
  const { isAdmin } = useAdminAuth()
  return (
    <article className="news-row">
      <div className="news-row-thumb">
        <SafeImage src={item.thumbnail} alt="" fallback={<span />} />
      </div>
      <div className="news-row-body">
        {isAdmin && item.date && <div className="date admin-only-date">{formatDate(item.date)} · 관리자에게만 보임</div>}
        <h3 className="title">
          {item.link ? (
            <a href={item.link} target="_blank" rel="noreferrer">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {item.summary && <p className="summary">{item.summary}</p>}
      </div>
    </article>
  )
}
