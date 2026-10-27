import { useEffect, useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem } from '../admin/collection'
import { makeId, saveData } from '../admin/dataStore'
import { showToast } from '../admin/toast'
import { lablifeFields } from '../admin/schemas'
import { cropToStyle, normalizeCrop } from '../admin/photoCrop'
import PageTitle from '../components/PageTitle'
import Pagination from '../components/Pagination'
import SafeImage, { resolveImageSrc } from '../components/SafeImage'
import EditModal from '../components/admin/LazyEditModal'
import { AdminFab, EditButton } from '../components/admin/AdminControls'
import { useDocumentMeta } from '../router/useDocumentMeta'
import { useLang, fillSeed } from '../i18n/LangContext'
import { useNoZoom } from '../hooks/useNoZoom'
import '../styles/lablife-order.css'

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

/**
 * 보이는 순서:
 *  - 관리자가 "순서 바꾸기"로 저장한 적이 있는 게시물은 저장된 순서(order)대로,
 *  - 순서가 저장된 적 없는(= 새로 올린) 게시물은 날짜가 최근인 것부터 맨 앞에 보여 줍니다.
 *  → 순서를 한 번도 안 바꿨다면 지금까지처럼 "최근 날짜 순"입니다.
 */
function sortItems(list) {
  const hasOrder = (i) => Number.isFinite(i.order)
  const fresh = list.filter((i) => !hasOrder(i)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const fixed = list.filter(hasOrder).sort((a, b) => a.order - b.order)
  return [...fresh, ...fixed]
}

export default function LabLife() {
  const { data, error, loading } = useData('lablife.json')
  const { token, isAdmin } = useAdminAuth()
  const [selected, setSelected] = useState(null)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [editing, setEditing] = useState(null) // { item|null }
  const [page, setPageState] = useState(1)
  const [draft, setDraft] = useState(null) // 순서 바꾸기 중일 때: 게시물 id 배열
  const [savingOrder, setSavingOrder] = useState(false)
  const { tr, loc, seedOf } = useLang()
  const view = (it) => loc(it, 'lablife') ?? {}

  useDocumentMeta('Lab Life', tr('CoRe Lab 구성원들의 일상과 활동 모습입니다.', 'Everyday moments and activities of CoRe Lab members.'))

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

  if (loading && !data) return <div className="page container">{tr('불러오는 중...', 'Loading...')}</div>
  if (error) return <div className="page container error-state">{error}</div>

  const sorted = sortItems(data ?? [])
  // 순서 바꾸기 중에는 임시 순서(draft)대로 보여 주고, 사진 전체를 한 번에(페이지 나누지 않고) 보여 줍니다.
  const ordering = Boolean(draft) && isAdmin
  const items = (() => {
    if (!ordering) return sorted
    const byId = new Map(sorted.map((i) => [i.id, i]))
    const ordered = draft.map((id) => byId.get(id)).filter(Boolean)
    sorted.forEach((i) => !draft.includes(i.id) && ordered.push(i))
    return ordered
  })()
  const pageCount = ordering ? 1 : Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount)
  const pageItems = ordering ? items : items.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  // 한 칸씩 / 맨 앞 / 맨 뒤로 옮기기
  const moveItem = (id, to) => {
    const ids = items.map((i) => i.id)
    const i = ids.indexOf(id)
    const j = to === 'first' ? 0 : to === 'last' ? ids.length - 1 : i + to
    if (i < 0 || j < 0 || j >= ids.length || i === j) return
    ids.splice(j, 0, ids.splice(i, 1)[0])
    setDraft(ids)
  }

  const saveOrder = async () => {
    setSavingOrder(true)
    try {
      const rank = new Map(draft.map((id, i) => [id, i]))
      await saveData(
        token,
        'lablife.json',
        (list) => {
          // 그사이 새로 올라온(draft에 없는) 게시물은 맨 앞에 두고, 나머지는 바꾼 순서대로 번호를 매깁니다.
          const known = list.filter((x) => rank.has(x.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id))
          const extra = list.filter((x) => !rank.has(x.id))
          const next = [...extra, ...known]
          next.forEach((x, i) => {
            x.order = i + 1
          })
          list.splice(0, list.length, ...next)
          return list
        },
        'Lab Life 순서 변경',
      )
      setDraft(null)
      showToast('순서를 저장했어요. 방문자 화면에는 1~2분 뒤 반영됩니다.')
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 6000)
    } finally {
      setSavingOrder(false)
    }
  }

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
      <PageTitle>Lab Life</PageTitle>
      {ordering && (
        <p className="reorder-banner">
          사진 아래 ◀ ▶ 버튼으로 순서를 바꾼 뒤, 오른쪽 아래 “순서 저장”을 눌러주세요. 번호가 작을수록 앞(위)에 보입니다. (⇤ 맨 앞으로 · ⇥ 맨 뒤로)
        </p>
      )}

      {items.length === 0 ? (
        <p className="empty-state">{tr('등록된 사진이 없습니다.', 'No photos yet.')}</p>
      ) : (
        <div className="gallery-grid">
          {pageItems.map((item, idx) => {
            const photos = photosOf(item)
            const v = view(item)
            return (
              <div key={item.id} className={`admin-item gallery-card${ordering ? ' is-reordering' : ''}`}>
                {!ordering && <EditButton onClick={() => setEditing({ item })} />}
                {ordering && <span className="gallery-order-num">{idx + 1}</span>}
                <button
                  className="gallery-item"
                  disabled={ordering}
                  onClick={() => openLightbox(item)}
                  aria-label={v.caption || tr('사진 크게 보기', 'View photo')}
                >
                  <SafeImage
                    src={photos[0]?.src}
                    alt={v.caption ?? ''}
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
                {v.caption && <p className="gallery-item-caption">{v.caption}</p>}
                {ordering && (
                  <div className="reorder-controls lablife-reorder-controls">
                    <button type="button" onClick={() => moveItem(item.id, 'first')} disabled={idx === 0} aria-label="맨 앞으로" title="맨 앞으로">
                      ⇤
                    </button>
                    <button type="button" onClick={() => moveItem(item.id, -1)} disabled={idx === 0} aria-label="앞으로" title="앞으로">
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={idx === items.length - 1}
                      aria-label="뒤로"
                      title="뒤로"
                    >
                      ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 'last')}
                      disabled={idx === items.length - 1}
                      aria-label="맨 뒤로"
                      title="맨 뒤로"
                    >
                      ⇥
                    </button>
                  </div>
                )}
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
                <button type="button" className="lightbox-close" onClick={closeLightbox} aria-label={tr('닫기', 'Close')}>
                  ×
                </button>

                <div className="lightbox-media">
                  <div className="lightbox-photo-frame">
                    <SafeImage
                      src={photos[photoIdx]?.src}
                      alt={view(selected).caption ?? ''}
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
                          aria-label={tr('이전 사진', 'Previous photo')}
                        >
                          <span className="lightbox-nav-icon">‹</span>
                        </button>
                        <button
                          type="button"
                          className="lightbox-nav lightbox-nav-next"
                          onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                          aria-label={tr('다음 사진', 'Next photo')}
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
                          aria-label={tr(`${i + 1}번째 사진`, `Photo ${i + 1}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {(view(selected).caption || view(selected).body) && (
                  <div className="lightbox-text">
                    {/^\d{4}-\d{2}/.test(selected.date ?? '') && (
                      <p className="lightbox-date">{selected.date.replace(/-/g, '.')}</p>
                    )}
                    {view(selected).caption && <p className="lightbox-caption">{view(selected).caption}</p>}
                    {view(selected).body && <p className="lightbox-body">{view(selected).body}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

      <AdminFab>
        {ordering ? (
          <>
            <button type="button" className="admin-fab-btn secondary" onClick={() => setDraft(null)} disabled={savingOrder}>
              취소
            </button>
            <button type="button" className="admin-fab-btn" onClick={saveOrder} disabled={savingOrder}>
              {savingOrder ? '저장 중...' : '순서 저장'}
            </button>
          </>
        ) : (
          <>
            {items.length > 1 && (
              <button type="button" className="admin-fab-btn secondary" onClick={() => setDraft(items.map((i) => i.id))}>
                ↔ 순서 바꾸기
              </button>
            )}
            <button type="button" className="admin-fab-btn" onClick={() => setEditing({ item: null })}>
              + 사진 추가
            </button>
          </>
        )}
      </AdminFab>

      {editing && (
        <EditModal
          title={editing.item ? '게시물 수정' : '사진 추가'}
          fields={lablifeFields()}
          initial={editing.item ? fillSeed(editing.item, seedOf(editing.item, 'lablife')) : { date: new Date().toISOString().slice(0, 7) }}
          uploadName={(v) => `lablife-${v.date || Date.now()}`}
          onSave={handleSave}
          onDelete={editing.item ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
