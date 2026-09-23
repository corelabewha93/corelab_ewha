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
          {items.map((item) => (
            <div key={item.id} className="admin-item">
              <EditButton onClick={() => setEditing({ item })} />
              <button
                className="gallery-item"
                onClick={() => setSelected(item)}
                aria-label={item.caption || '사진 크게 보기'}
              >
                <SafeImage src={imagesOf(item)[0]} alt={item.caption ?? ''} fallback={<span />} />
              </button>
            </div>
          ))}
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
