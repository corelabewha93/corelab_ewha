import { useData } from '../hooks/useData'
import NewsCard from '../components/NewsCard'

export default function News() {
  const { data, error, loading } = useData('news.json')

  if (loading) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const items = [...(data ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="page container">
      <h1 className="section-title">News</h1>
      {items.length === 0 ? (
        <p className="empty-state">등록된 소식이 없습니다.</p>
      ) : (
        <div className="news-grid">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
