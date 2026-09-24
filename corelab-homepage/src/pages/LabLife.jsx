import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem } from '../admin/collection'
import { makeId } from '../admin/dataStore'
import { lablifeFields } from '../admin/schemas'
import SafeImage from '../components/SafeImage'
import EditModal from '../components/admin/EditModal'
import { AdminFab, EditButton } from '../components/admin/AdminControls'

function imagesOf(item) {
  if (Array.isArray(item.images)) return item.images.filter(Boolean)
  return item.image ? [item.image] : []
}

export default function LabLife() {
  const { data, error, loading } = useData('lablife.json')
  const { token } = useAdminAuth()
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null) // { item|null }

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const items = [...(data ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const handleSave = async (values) => {
    const original = editing.item
    const item = { ...values, id: original?.id ?? makeId('lablife') }
    await upsertItem(
      token,
      'lablife.json',
      null,
      item,
      original ? `Lab Life 수정: ${values.caption || original.id}` : `Lab Life 추가: ${values.caption || item.id}`,
    )
  }

  const handleDelete = async () => {
    await deleteItem(token, 'lablife.json', null, editing.item.id, 'Lab Life 게시물 삭제')
  }

  return (
    <div className="page container">
      <h1 className="section-title">Lab Life</h1>

      {items.length === 0 ? (
        <p className="empty-state">등록된 사진이 없습니다.</p>
      ) : (
        <div className="gallery-grid">
          {items.map((item) => {
            const photos = imagesOf(item)
            return (
              <div key={item.id} className="admin-item gallery-card">
                <EditButton onClick={() => setEditing({ item })} />
                <button
                  className="gallery-item"
                  onClick={() => setSelected(item)}
                  aria-label={item.caption || '사진 크게 보기'}
                >
                  <SafeImage src={photos[0]} alt={item.caption ?? ''} fallback={<span />} />
                  {photos.length > 1 && (
                    <span className="gallery-item-count">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
                        <rect x="7.5" y="4.5" width="13" height="13" rx="2.2" fill="currentColor" opacity="0.45" />
                        <rect x="3.5" y="8.5" width="13" height="13" rx="2.2" fill="currentColor" />
                      </svg>
                      {photos.length}
                    </span>
                  )}
                </button>
                {item.caption && <p className="gallery-item-caption">{item.caption}</p>}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="lightbox-overlay" onClick={() => setSelected(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-images">
              {imagesOf(selected).map((src, i) => (
                <SafeImage key={i} src={src} alt={selected.caption ?? ''} fallback={<span />} />
              ))}
            </div>
            {selected.caption && <p className="lightbox-caption">{selected.caption}</p>}
            {selected.body && <p className="lightbox-body">{selected.body}</p>}
          </div>
        </div>
      )}

      <AdminFab>
        <button type="button" className="admin-fab-btn" onClick={() => setEditing({ item: null })}>
          + 사진 추가
        </button>
      </AdminFab>

      {editing && (
        <EditModal
          title={editing.item ? '게시물 수정' : '사진 추가'}
          fields={lablifeFields()}
          initial={editing.item ?? { date: new Date().toISOString().slice(0, 7) }}
          uploadName={(v) => `lablife-${v.date || Date.now()}`}
          onSave={handleSave}
          onDelete={editing.item ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
