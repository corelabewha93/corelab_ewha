import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem } from '../admin/collection'
import { makeId } from '../admin/dataStore'
import { newsFields } from '../admin/schemas'
import { useHashRoute, navigate } from '../router/useHashRoute'
import NewsCard from '../components/NewsCard'
import SafeImage from '../components/SafeImage'
import EditModal from '../components/admin/EditModal'
import { AdminFab, EditButton } from '../components/admin/AdminControls'

// 본문 중간 사진 표시([사진2] 등)는 목록 미리보기 요약 글에서 제외합니다.
const IMAGE_MARKER = /^\[\s*사진\s*(\d+)(?:\s*:\s*(왼쪽|가운데|오른쪽))?\s*\]$/

function excerptOf(item) {
  const body = Array.isArray(item.body) ? item.body : item.summary ? [item.summary] : []
  const text = body.find((p) => !p.trim().match(IMAGE_MARKER))
  if (!text) return ''
  return text.length > 70 ? `${text.slice(0, 70)}…` : text
}

export default function News() {
  const { data, error, loading } = useData('news.json')
  const { token } = useAdminAuth()
  const { query } = useHashRoute()
  const [editing, setEditing] = useState(null) // { item|null }

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const items = data ?? []
  const openItem = query.id ? items.find((i) => i.id === query.id) : null

  const handleSave = async (values) => {
    const original = editing.item
    const item = { ...values, id: original?.id ?? makeId('news'), createdAt: original?.createdAt ?? new Date().toISOString() }
    await upsertItem(token, 'news.json', null, item, original ? `소식 수정: ${item.title}` : `소식 추가: ${item.title}`, {
      prepend: !original,
    })
  }

  const handleDelete = async () => {
    const wasOpen = openItem?.id === editing.item.id
    await deleteItem(token, 'news.json', null, editing.item.id, `소식 삭제: ${editing.item.title}`)
    if (wasOpen) navigate('/news')
  }

  // 게시글 하나를 클릭해서 들어온 화면: 그 글만 크게 보여줍니다.
  if (openItem) {
    return (
      <div className="page container">
        <button type="button" className="news-back-link" onClick={() => navigate('/news')}>
          ← News 목록으로
        </button>
        <div className="admin-item news-detail">
          <EditButton onClick={() => setEditing({ item: openItem })} label={`${openItem.title} 수정`} />
          <NewsCard item={openItem} />
        </div>

        {editing && (
          <EditModal
            title="소식 수정"
            fields={newsFields}
            initial={editing.item}
            uploadName={() => `news-${Date.now()}`}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    )
  }

  // 목록 화면: 카드를 눌러야 본문이 열립니다.
  return (
    <div className="page container">
      <h1 className="section-title">News</h1>
      {items.length === 0 ? (
        <p className="empty-state">등록된 소식이 없습니다.</p>
      ) : (
        <div className="news-list-grid">
          {items.map((item) => {
            const thumb = Array.isArray(item.images) ? item.images[0] : item.images || item.thumbnail
            const excerpt = excerptOf(item)
            return (
              <div key={item.id} className="admin-item">
                <EditButton onClick={() => setEditing({ item })} />
                <button type="button" className="news-list-card" onClick={() => navigate(`/news?id=${item.id}`)}>
                  <div className="news-list-thumb">
                    <SafeImage src={thumb} alt="" fallback={<span />} />
                  </div>
                  <div className="news-list-body">
                    <h3 className="news-list-title">{item.title}</h3>
                    {item.subtitle && <p className="news-list-subtitle">{item.subtitle}</p>}
                    {excerpt && <p className="news-list-excerpt">{excerpt}</p>}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}

      <AdminFab>
        <button type="button" className="admin-fab-btn" onClick={() => setEditing({ item: null })}>
          + 소식 추가
        </button>
      </AdminFab>

      {editing && (
        <EditModal
          title={editing.item ? '소식 수정' : '새 소식 추가'}
          fields={newsFields}
          initial={editing.item ?? {}}
          uploadName={() => `news-${Date.now()}`}
          onSave={handleSave}
          onDelete={editing.item ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
