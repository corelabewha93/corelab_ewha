import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem } from '../admin/collection'
import { makeId } from '../admin/dataStore'
import { newsFields } from '../admin/schemas'
import NewsCard from '../components/NewsCard'
import EditModal from '../components/admin/EditModal'
import { AdminFab, EditButton } from '../components/admin/AdminControls'

export default function News() {
  const { data, error, loading } = useData('news.json')
  const { token } = useAdminAuth()
  const [editing, setEditing] = useState(null) // { item|null }

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const items = [...(data ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date))

  const handleSave = async (values) => {
    const original = editing.item
    const item = { ...values, id: original?.id ?? makeId('news') }
    await upsertItem(token, 'news.json', null, item, original ? `소식 수정: ${item.title}` : `소식 추가: ${item.title}`)
  }

  const handleDelete = async () => {
    await deleteItem(token, 'news.json', null, editing.item.id, `소식 삭제: ${editing.item.title}`)
  }

  return (
    <div className="page container">
      <h1 className="section-title">News</h1>
      {items.length === 0 ? (
        <p className="empty-state">등록된 소식이 없습니다.</p>
      ) : (
        <div className="news-list">
          {items.map((item) => (
            <div key={item.id} className="admin-item">
              <EditButton onClick={() => setEditing({ item })} />
              <NewsCard item={item} />
            </div>
          ))}
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
          initial={editing.item ?? { date: new Date().toISOString().slice(0, 10) }}
          uploadName={(v) => `news-${v.date || ''}`}
          onSave={handleSave}
          onDelete={editing.item ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
