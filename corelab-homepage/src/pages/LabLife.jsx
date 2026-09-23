import { useState } from 'react'
import { useData } from '../hooks/useData'
import SafeImage from '../components/SafeImage'

export default function LabLife() {
  const { data, error, loading } = useData('lablife.json')
  const [selected, setSelected] = useState(null)

  if (loading) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const items = [...(data ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div className="page container">
      <h1 className="section-title">Lab Life</h1>

      {items.length === 0 ? (
        <p className="empty-state">등록된 사진이 없습니다.</p>
      ) : (
        <div className="gallery-grid">
          {items.map((item) => (
            <button
              key={item.id}
              className="gallery-item"
              onClick={() => setSelected(item)}
              aria-label={item.caption || '사진 크게 보기'}
            >
              <SafeImage src={item.image} alt={item.caption ?? ''} fallback={<span />} />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="lightbox-overlay" onClick={() => setSelected(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <SafeImage src={selected.image} alt={selected.caption ?? ''} fallback={<span />} />
            {selected.caption && <p className="lightbox-caption">{selected.caption}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
