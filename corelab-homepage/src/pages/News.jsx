import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem, reorderItems } from '../admin/collection'
import { showToast } from '../admin/toast'
import { makeId } from '../admin/dataStore'
import { newsFields } from '../admin/schemas'
import { useHashRoute, navigate } from '../router/useHashRoute'
import NewsCard from '../components/NewsCard'
import SafeImage from '../components/SafeImage'
import EditModal from '../components/admin/EditModal'
import { AdminFab, EditButton } from '../components/admin/AdminControls'
import { useDocumentMeta } from '../router/useDocumentMeta'

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
  const { token, isAdmin } = useAdminAuth()
  const { query } = useHashRoute()
  const [editing, setEditing] = useState(null) // { item|null }
  const [draft, setDraft] = useState(null) // 순서 바꾸기 중일 때: 소식 id 배열
  const [savingOrder, setSavingOrder] = useState(false)

  useDocumentMeta('News', '이화여자대학교 CoRe Lab의 소식과 활동을 전합니다.')

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  // hidden: 'hidden'인 소식은 방문자에게 보이지 않습니다 (관리자에게는 흐리게 보임).
  const visibleItems = (data ?? []).filter((i) => isAdmin || !i.hidden)
  // 순서 바꾸기 중에는 임시 순서(draft)대로 보여줍니다.
  const ordering = Boolean(draft) && isAdmin
  const items = (() => {
    if (!ordering) return visibleItems
    const byId = new Map(visibleItems.map((i) => [i.id, i]))
    const ordered = draft.map((id) => byId.get(id)).filter(Boolean)
    visibleItems.forEach((i) => !draft.includes(i.id) && ordered.push(i))
    return ordered
  })()
  const openItem = query.id ? items.find((i) => i.id === query.id) : null

  // 소식 "숨기기 / 표시하기" 버튼
  // 값은 관리자 입력창의 "표시 여부" 선택칸과 같은 형식('hidden' 또는 빈 문자열)으로 저장합니다.
  const toggleHidden = async (item) => {
    const hidden = item.hidden ? '' : 'hidden'
    try {
      await upsertItem(token, 'news.json', null, { ...item, hidden }, `소식 ${hidden ? '숨김' : '표시'}: ${item.title}`)
      showToast(
        hidden
          ? '소식을 숨겼어요. 방문자 화면에는 1~2분 뒤 반영됩니다.'
          : '소식을 다시 표시해요. 방문자 화면에는 1~2분 뒤 반영됩니다.',
      )
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 6000)
    }
  }

  const hideButton = (item) =>
    isAdmin ? (
      <button
        type="button"
        className={`news-hide-btn${item.hidden ? ' is-hidden' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          toggleHidden(item)
        }}
        title={item.hidden ? '방문자에게 다시 보이게 합니다' : '방문자에게 보이지 않게 숨깁니다'}
      >
        {item.hidden ? '표시하기' : '숨기기'}
      </button>
    ) : null

  const moveItem = (id, dir) => {
    const ids = items.map((i) => i.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setDraft(ids)
  }

  const saveOrder = async () => {
    setSavingOrder(true)
    try {
      await reorderItems(token, 'news.json', null, draft, '소식 순서 변경')
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
      <div className="page container news-detail-page">
        <button type="button" className="news-back-link" onClick={() => navigate('/news')}>
          ← News 목록으로
        </button>
        <div className={`admin-item news-detail${openItem.hidden ? ' news-hidden' : ''}`}>
          <EditButton onClick={() => setEditing({ item: openItem })} label={`${openItem.title} 수정`} />
          {hideButton(openItem)}
          {openItem.hidden && <p className="news-hidden-note">숨긴 소식 · 관리자에게만 보입니다</p>}
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
      {ordering && (
        <p className="reorder-banner">◀ ▶ 버튼으로 순서를 바꾼 뒤, 오른쪽 아래 “순서 저장”을 눌러주세요. (앞쪽일수록 위에 보입니다)</p>
      )}
      {items.length === 0 ? (
        <p className="empty-state">등록된 소식이 없습니다.</p>
      ) : (
        <div className="news-list-grid">
          {items.map((item, idx) => {
            const thumb = Array.isArray(item.images) ? item.images[0] : item.images || item.thumbnail
            const excerpt = excerptOf(item)
            return (
              <div key={item.id} className={`admin-item${item.hidden ? ' news-hidden' : ''}`}>
                {!ordering && <EditButton onClick={() => setEditing({ item })} />}
                {!ordering && hideButton(item)}
                <button
                  type="button"
                  className="news-list-card"
                  disabled={ordering}
                  onClick={() => navigate(`/news?id=${item.id}`)}
                >
                  <div className="news-list-thumb">
                    <SafeImage src={thumb} alt="" fallback={<span />} />
                  </div>
                  <div className="news-list-body">
                    {item.hidden && <span className="news-hidden-chip">숨김 · 관리자에게만 보임</span>}
                    <h3 className="news-list-title">{item.title}</h3>
                    {item.subtitle && <p className="news-list-subtitle">{item.subtitle}</p>}
                    {excerpt && <p className="news-list-excerpt">{excerpt}</p>}
                  </div>
                </button>
                {ordering && (
                  <div className="reorder-controls">
                    <button type="button" onClick={() => moveItem(item.id, -1)} disabled={idx === 0} aria-label="앞으로">
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={idx === items.length - 1}
                      aria-label="뒤로"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
              <button
                type="button"
                className="admin-fab-btn secondary"
                onClick={() => setDraft(items.map((i) => i.id))}
              >
                ↔ 순서 바꾸기
              </button>
            )}
            <button type="button" className="admin-fab-btn" onClick={() => setEditing({ item: null })}>
              + 소식 추가
            </button>
          </>
        )}
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
