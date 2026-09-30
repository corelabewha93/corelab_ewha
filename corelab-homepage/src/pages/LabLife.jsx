import { useEffect, useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem } from '../admin/collection'
import { makeId } from '../admin/dataStore'
import { lablifeFields } from '../admin/schemas'
import { cropToStyle, normalizeCrop } from '../admin/photoCrop'
import Pagination from '../components/Pagination'
import SafeImage, { resolveImageSrc } from '../components/SafeImage'
import EditModal from '../components/admin/EditModal'
import { AdminFab, EditButton } from '../components/admin/AdminControls'
import { useDocumentMeta } from '../router/useDocumentMeta'
import { useNoZoom } from '../hooks/useNoZoom'

// 사진 배열과, 각 사진에 저장된 위치·확대(imageCrops)를 짝지어 돌려줍니다.
// (imageCrops가 없거나 개수가 안 맞아도 기본값으로 채워지므로 안전합니다.)
function photosOf(item) {
  const images = Array.isArray(item.images) ? item.images : item.image ? [item.image] : []
  const crops = Array.isArray(item.imageCrops) ? item.imageCrops : []
  return images
    .map((src, i) => ({ src, crop: crops[i] }))
    .filter((p) => p.src)
}

function imagesOf(item) {
  return photosOf(item).map((p) => p.src)
}

const PAGE_SIZE = 12

export default function LabLife() {
  const { data, error, loading } = useData('lablife.json')
  const { token, isAdmin } = useAdminAuth()
  const [selected, setSelected] = useState(null)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [editing, setEditing] = useState(null) // { item|null }
  const [page, setPageState] = useState(1)

  useDocumentMeta('Lab Life', 'CoRe Lab 구성원들의 일상과 활동 모습입니다.')

  // 사진을 손가락으로 벌리거나 트랙패드로 확대하지 못하게 막습니다 (이 페이지에서만).
  useNoZoom()

  const openLightbox = (item) => {
    setSelected(item)
    setPhotoIdx(0)
  }
  const closeLightbox = () => setSelected(null)
  const setPage = (n) => {
    setPageState(n)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (!selected) return
    const photos = imagesOf(selected)
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (photos.length > 1 && e.key === 'ArrowLeft') setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)
      if (photos.length > 1 && e.key === 'ArrowRight') setPhotoIdx((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  // 사진 넘길 때 버벅이지 않도록, 열린 게시물의 모든 사진을 미리 불러와 둡니다.
  useEffect(() => {
    if (!selected) return
    imagesOf(selected).forEach((src) => {
      const url = resolveImageSrc(src, isAdmin)
      if (!url) return
      const img = new Image()
      img.decoding = 'async'
      img.src = url
    })
  }, [selected, isAdmin])

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const items = [...(data ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount)
  const pageItems = items.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

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
          {pageItems.map((item) => {
            const photos = photosOf(item)
            return (
              <div key={item.id} className="admin-item gallery-card">
                <EditButton onClick={() => setEditing({ item })} />
                <button
                  className="gallery-item"
                  onClick={() => openLightbox(item)}
                  aria-label={item.caption || '사진 크게 보기'}
                >
                  <SafeImage
                    src={photos[0]?.src}
                    alt={item.caption ?? ''}
                    fallback={<span />}
                    imgStyle={cropToStyle(normalizeCrop({ photoCrop: photos[0]?.crop }))}
                  />
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

      <Pagination page={curPage} pageCount={pageCount} onChange={setPage} />

      {selected &&
        (() => {
          const photos = photosOf(selected)
          const multi = photos.length > 1
          return (
            <div className="lightbox-overlay" onClick={closeLightbox}>
              <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="lightbox-close" onClick={closeLightbox} aria-label="닫기">
                  ×
                </button>

                <div className="lightbox-photo-frame">
                  <SafeImage
                    src={photos[photoIdx]?.src}
                    alt={selected.caption ?? ''}
                    fallback={<span />}
                    loading="eager"
                    imgStyle={cropToStyle(normalizeCrop({ photoCrop: photos[photoIdx]?.crop }))}
                  />
                  {multi && (
                    <>
                      <button
                        type="button"
                        className="lightbox-nav lightbox-nav-prev"
                        onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                        aria-label="이전 사진"
                      >
                        <span className="lightbox-nav-icon">‹</span>
                      </button>
                      <button
                        type="button"
                        className="lightbox-nav lightbox-nav-next"
                        onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                        aria-label="다음 사진"
                      >
                        <span className="lightbox-nav-icon">›</span>
                      </button>
                      <span className="lightbox-counter">
                        {photoIdx + 1} / {photos.length}
                      </span>
                    </>
                  )}
                </div>

                {multi && (
                  <div className="lightbox-dots">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`lightbox-dot${i === photoIdx ? ' active' : ''}`}
                        onClick={() => setPhotoIdx(i)}
                        aria-label={`${i + 1}번째 사진`}
                      />
                    ))}
                  </div>
                )}

                {(selected.caption || selected.body) && (
                  <div className="lightbox-text">
                    {selected.caption && <p className="lightbox-caption">{selected.caption}</p>}
                    {selected.body && <p className="lightbox-body">{selected.body}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

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
