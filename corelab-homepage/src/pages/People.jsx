import { useMemo, useState } from 'react'
import { useData } from '../hooks/useData'
import { useQueryTab } from '../router/useHashRoute'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { upsertItem, deleteItem, reorderItems } from '../admin/collection'
import { makeId } from '../admin/dataStore'
import { normalizeCrop } from '../admin/photoCrop'
import { personFields } from '../admin/schemas'
import { showToast } from '../admin/toast'
import Tabs from '../components/Tabs'
import PersonCard from '../components/PersonCard'
import EditModal from '../components/admin/EditModal'
import { AdminFab } from '../components/admin/AdminControls'

const TABS = [
  { key: 'faculty', label: 'Faculty' },
  { key: 'students', label: 'Students' },
  { key: 'alumni', label: 'Alumni' },
]
const CATEGORIES = TABS.map((t) => t.key)

// 재학생은 박사 → 석사 → 학부연구생 순. (예전 'Integrated'는 박사 과정으로 봅니다)
const STUDENT_GROUPS = [
  { key: 'PhD', label: 'PhD' },
  { key: 'MA', label: 'MA' },
  { key: 'BA', label: 'BA' },
]

function studentGroup(person) {
  if (person.degree === 'PhD' || person.degree === 'Integrated') return 'PhD'
  if (person.degree === 'BA') return 'BA'
  return 'MA'
}

function groupKeyFor(category) {
  return category === 'students' ? studentGroup : () => 'all'
}

/** 같은 그룹 안에서 한 칸 앞/뒤로 옮긴 새 목록 */
function moveWithinGroup(list, id, dir, groupOf) {
  const target = list.find((p) => p.id === id)
  if (!target) return list
  const g = groupOf(target)
  const same = list.filter((p) => groupOf(p) === g)
  const i = same.findIndex((p) => p.id === id)
  const j = i + dir
  if (j < 0 || j >= same.length) return list
  ;[same[i], same[j]] = [same[j], same[i]]
  let k = 0
  return list.map((p) => (groupOf(p) === g ? same[k++] : p))
}

export default function People() {
  const { data, error, loading } = useData('people.json')
  const [tab, setTab] = useQueryTab('/people', CATEGORIES, 'faculty')
  const { token } = useAdminAuth()

  const [editing, setEditing] = useState(null) // { person|null, category }
  const [draft, setDraft] = useState(null) // { tab, ids } 순서 바꾸기 중일 때
  const [savingOrder, setSavingOrder] = useState(false)

  const ordering = draft && draft.tab === tab

  const list = useMemo(() => {
    const base = data?.[tab] ?? []
    if (!ordering) return base
    const byId = new Map(base.map((p) => [p.id, p]))
    const ordered = draft.ids.map((id) => byId.get(id)).filter(Boolean)
    base.forEach((p) => !draft.ids.includes(p.id) && ordered.push(p))
    return ordered
  }, [data, tab, ordering, draft])

  const groupOf = groupKeyFor(tab)

  const reorderPropsFor = (person) => {
    if (!ordering) return null
    const same = list.filter((p) => groupOf(p) === groupOf(person))
    const i = same.findIndex((p) => p.id === person.id)
    return {
      canPrev: i > 0,
      canNext: i < same.length - 1,
      move: (dir) => setDraft({ tab, ids: moveWithinGroup(list, person.id, dir, groupOf).map((p) => p.id) }),
    }
  }

  const startOrdering = () => setDraft({ tab, ids: (data?.[tab] ?? []).map((p) => p.id) })

  const saveOrder = async () => {
    setSavingOrder(true)
    try {
      await reorderItems(token, 'people.json', tab, draft.ids, `People 순서 변경 (${tab})`)
      setDraft(null)
      showToast('순서를 저장했어요. 방문자 화면에는 1~2분 뒤 반영됩니다.')
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 6000)
    } finally {
      setSavingOrder(false)
    }
  }

  const handleSave = async (values) => {
    const { category, ...rest } = values
    const original = editing.person
    const item = {
      ...rest,
      id: original?.id ?? makeId('person'),
      photoPosition: undefined, // 예전 방식(위/가운데/아래) 대신 photoCrop 사용
      admission: category === 'students' ? undefined : original?.admission,
      graduation: category === 'alumni' ? original?.graduation : undefined,
    }
    await upsertItem(
      token,
      'people.json',
      category,
      item,
      original ? `구성원 수정: ${item.name}` : `구성원 등록: ${item.name}`,
      { otherKeys: CATEGORIES },
    )
    if (category !== tab) setTab(category)
  }

  const handleDelete = async () => {
    const { person, category } = editing
    await deleteItem(token, 'people.json', category, person.id, `구성원 삭제: ${person.name}`)
  }

  const renderGrid = (people, category) => (
    <div className="people-grid">
      {people.map((p) => (
        <PersonCard
          key={p.id}
          person={p}
          category={category}
          onEdit={(person) => setEditing({ person, category })}
          reorder={reorderPropsFor(p)}
        />
      ))}
    </div>
  )

  const renderContent = () => {
    if (list.length === 0) {
      const label = { faculty: '교수진', students: '재학생', alumni: '졸업생' }[tab]
      return <p className="empty-state">등록된 {label}이 없습니다.</p>
    }
    if (tab === 'students') {
      return STUDENT_GROUPS.map((g) => {
        const members = list.filter((p) => studentGroup(p) === g.key)
        if (members.length === 0) return null
        return (
          <section key={g.key} className="people-group">
            <h3 className="people-group-title">{g.label}</h3>
            {renderGrid(members, 'students')}
          </section>
        )
      })
    }
    return renderGrid(list, tab)
  }

  return (
    <div className="page container">
      <h1 className="section-title">People</h1>

      <div className="tabs-layout">
        <Tabs
          tabs={TABS}
          current={tab}
          onChange={(t) => {
            setDraft(null)
            setTab(t)
          }}
        />

        <div className="tabs-content">
          {loading && !data && <div>불러오는 중...</div>}
          {error && <div className="error-state">{error}</div>}
          {ordering && (
            <p className="reorder-banner">◀ ▶ 버튼으로 순서를 바꾼 뒤, 오른쪽 아래 “순서 저장”을 눌러주세요.</p>
          )}
          {data && renderContent()}
        </div>
      </div>

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
            {list.length > 1 && (
              <button type="button" className="admin-fab-btn secondary" onClick={startOrdering}>
                ↔ 순서 바꾸기
              </button>
            )}
            <button type="button" className="admin-fab-btn" onClick={() => setEditing({ person: null, category: tab })}>
              + 추가
            </button>
          </>
        )}
      </AdminFab>

      {editing && (
        <EditModal
          title={editing.person ? '구성원 정보 수정' : '새 구성원 추가'}
          fields={personFields}
          initial={{
            ...(editing.person ?? {}),
            degree: editing.person ? (studentGroup(editing.person)) : 'MA',
            category: editing.category,
            photoCrop: normalizeCrop(editing.person),
          }}
          uploadName={(v) => v.name}
          onSave={handleSave}
          onDelete={editing.person ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
