import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { useHashRoute, useQueryTab } from '../../router/useHashRoute'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { upsertItem, deleteItem, reorderItems } from '../../admin/collection'
import { makeId } from '../../admin/dataStore'
import { showToast } from '../../admin/toast'
import { publicationFields, projectFields, patentFields, toolFields } from '../../admin/schemas'
import Tabs from '../../components/Tabs'
import PageTitle from '../../components/PageTitle'
import EditModal from '../../components/admin/EditModal'
import { AdminFab } from '../../components/admin/AdminControls'
import { useDocumentMeta } from '../../router/useDocumentMeta'
import Publications from './Publications'
import Projects from './Projects'
import Patents from './Patents'
import Tools from './Tools'
import Theses, { moveThesisWithinYear } from './Theses'
import AuthorResearch from './AuthorResearch'

const TABS = [
  { key: 'publications', label: 'Publications' },
  { key: 'theses', label: 'Dissertations' },
  { key: 'projects', label: 'Projects' },
  { key: 'patents', label: 'Patents' },
  { key: 'tools', label: 'Systems & Tools' },
]

const EDITORS = {
  // 학술지 논문 · 학회 발표 · 저역서(type: 'book')가 모두 publications 목록에 함께 저장됩니다.
  publications: { fields: publicationFields, label: '논문', prefix: 'pub', titleOf: (i) => i.title },
  // 학위논문도 같은 목록(publications)에 type: 'other'로 저장되고, Dissertations 탭에서만 보여줍니다.
  theses: {
    fields: publicationFields,
    label: '학위논문',
    prefix: 'pub',
    titleOf: (i) => i.title,
    dataKey: 'publications',
    defaults: () => ({ type: 'other', year: new Date().getFullYear() }),
  },
  projects: { fields: projectFields, label: '연구과제', prefix: 'proj', titleOf: (i) => i.title },
  patents: { fields: patentFields, label: '특허', prefix: 'pat', titleOf: (i) => i.title },
  tools: { fields: toolFields, label: '시스템/도구', prefix: 'tool', titleOf: (i) => i.name },
}

export default function Research() {
  const { data, error, loading } = useData('research.json')
  const [tab, setTab] = useQueryTab('/research', TABS.map((t) => t.key), 'publications')
  const { query: routeQuery } = useHashRoute()
  const searchQuery = routeQuery.q ?? ''

  useDocumentMeta('Research', 'CoRe Lab의 논문·저역서, 학위논문, 연구과제, 특허, 시스템 및 도구 연구 실적입니다.')

  // People 페이지의 "OOO의 연구 실적" 링크(#/research?author=이름)로 들어오면
  // 그 사람 이름이 올라간 논문·저역서·특허를 한 화면에 모아 보여줍니다(AuthorResearch).
  // people.json에 적어둔 영문 표기(pubNames)도 같은 사람으로 봅니다.
  const { data: people } = useData('people.json')
  const { token, isAdmin } = useAdminAuth()
  const authorName = routeQuery.author ?? ''
  const authorFilter = useMemo(() => {
    if (!authorName) return null
    const everyone = ['faculty', 'students', 'alumni'].flatMap((k) => people?.[k] ?? [])
    const person = everyone.find((p) => p.name === authorName)
    // 본인이 원치 않아 모아보기를 숨긴 사람은, 주소로 직접 들어와도 방문자에게는 전체 목록을 보여줍니다.
    if (person?.hideResearch && !isAdmin) return null
    const extra = Array.isArray(person?.pubNames) ? person.pubNames : []
    return { name: authorName, aliases: [authorName, ...extra], hidden: Boolean(person?.hideResearch) }
  }, [authorName, people, isAdmin])
  const [editing, setEditing] = useState(null) // { key, item|null }

  // 학위논문 "순서 바꾸기": 같은 연도 안에서 위/아래로 옮기고 저장합니다.
  // draft = 바꾸는 중인 학위논문 id 순서 (아니면 null). 저장할 때는 학위논문이 있던 자리만 바꾸고
  // 일반 논문 등 다른 항목의 순서는 그대로 둡니다.
  const [draft, setDraft] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const ordering = tab === 'theses' && Boolean(draft)

  const startOrdering = () =>
    setDraft((data?.publications ?? []).filter((p) => p.type === 'other').map((p) => p.id))

  const saveOrder = async () => {
    setSavingOrder(true)
    try {
      const all = data?.publications ?? []
      const thesisIds = all.filter((p) => p.type === 'other').map((p) => p.id)
      // 바꾸는 사이 새로 생긴 학위논문은 맨 뒤에 둡니다.
      const queue = [...draft.filter((id) => thesisIds.includes(id)), ...thesisIds.filter((id) => !draft.includes(id))]
      let k = 0
      const ids = all.map((p) => (p.type === 'other' ? queue[k++] : p.id))
      await reorderItems(token, 'research.json', 'publications', ids, '학위논문 순서 변경')
      setDraft(null)
      showToast('순서를 저장했어요. 방문자 화면에는 1~2분 뒤 반영됩니다.')
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 6000)
    } finally {
      setSavingOrder(false)
    }
  }

  const onEdit = (key) => (item) => setEditing({ key, item })
  const editor = editing && EDITORS[editing.key]

  const handleSave = async (values) => {
    const { key, item: original } = editing
    const ed = EDITORS[key]
    const item = { ...values, id: original?.id ?? makeId(ed.prefix) }
    const verb = original ? '수정' : '추가'
    await upsertItem(token, 'research.json', ed.dataKey ?? key, item, `${ed.label} ${verb}: ${ed.titleOf(item)}`)
  }

  const handleDelete = async () => {
    const { key, item } = editing
    const ed = EDITORS[key]
    await deleteItem(token, 'research.json', ed.dataKey ?? key, item.id, `${ed.label} 삭제: ${ed.titleOf(item)}`)
  }

  // 특허 "숨김/표시" 버튼: 등록이 확정되지 않은 특허를 잠시 감춰 두었다가 다시 띄울 때 씁니다.
  const togglePatentHidden = async (pat) => {
    // 값은 관리자 입력창의 "표시 여부" 선택칸과 같은 형식('hidden' 또는 빈 문자열)으로 저장합니다.
    const hidden = pat.hidden ? '' : 'hidden'
    await upsertItem(
      token,
      'research.json',
      'patents',
      { ...pat, hidden },
      `특허 ${hidden ? '숨김' : '표시'}: ${pat.title}`,
    )
  }

  // 모아보기에서 "내 실적 아님 / 다시 포함" 버튼: 동명이인 논문을 이 사람의 실적에서만 빼거나 되돌립니다.
  // 항목에 excludeAuthors(제외할 사람 이름 목록)를 적어 두는 방식이라, 전체 논문 목록에는 영향이 없습니다.
  const toggleExclude = async (item, dataKey, name) => {
    const current = Array.isArray(item.excludeAuthors) ? item.excludeAuthors : []
    const excluded = current.includes(name)
    const next = excluded ? current.filter((n) => n !== name) : [...current, name]
    const title = item.title ?? ''
    try {
      await upsertItem(
        token,
        'research.json',
        dataKey,
        { ...item, excludeAuthors: next },
        `${name} 실적 ${excluded ? '다시 포함' : '제외'}: ${title}`,
      )
      showToast(
        excluded
          ? `${name}의 연구 실적에 다시 포함했어요. 방문자 화면에는 1~2분 뒤 반영됩니다.`
          : `${name}의 연구 실적에서 뺐어요. 방문자 화면에는 1~2분 뒤 반영됩니다.`,
      )
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 6000)
    }
  }

  const initialFor = (key) =>
    EDITORS[key].defaults?.() ?? (key === 'publications' ? { year: new Date().getFullYear() } : {})

  return (
    <div className="page container">
      <PageTitle pinDesktop sub={authorFilter ? authorFilter.name : TABS.find((t) => t.key === tab)?.label}>
        Research
      </PageTitle>

      <div className="tabs-layout">
        {/* 모아보기 중에는 어떤 탭도 선택된 것으로 표시하지 않습니다. 탭을 누르면 모아보기가 끝납니다. */}
        <Tabs
          tabs={TABS}
          current={authorFilter ? '' : tab}
          onChange={(t) => {
            setDraft(null)
            setTab(t)
          }}
        />

        <div className="tabs-content">
          {loading && !data && <div>불러오는 중...</div>}
          {error && <div className="error-state">{error}</div>}

          {data && authorFilter && (
            <AuthorResearch
              key={authorName}
              data={data}
              author={authorFilter}
              onClear={() => {
                setTab('publications')
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
              }}
              onEdit={{
                publications: onEdit('publications'),
                theses: onEdit('theses'),
                patents: onEdit('patents'),
                projects: onEdit('projects'),
              }}
              onToggleHidden={togglePatentHidden}
              onToggleExclude={toggleExclude}
            />
          )}

          {data && !authorFilter && ordering && (
            <p className="reorder-banner">
              ▲ ▼ 버튼으로 순서를 바꾼 뒤, 오른쪽 아래 “순서 저장”을 눌러주세요. (같은 연도 안에서만 옮길 수 있어요. 위쪽일수록 먼저 보입니다)
            </p>
          )}

          {data && !authorFilter && (
            <>
              {tab === 'publications' && (
                <Publications
                  key={searchQuery}
                  items={data.publications}
                  onEdit={onEdit('publications')}
                  initialQuery={searchQuery}
                />
              )}
              {tab === 'theses' && (
                <Theses
                  items={data.publications}
                  onEdit={onEdit('theses')}
                  order={ordering ? draft : null}
                  onMove={(id, dir) =>
                    setDraft((ids) => moveThesisWithinYear(data.publications, ids, id, dir))
                  }
                />
              )}
              {tab === 'projects' && <Projects items={data.projects} onEdit={onEdit('projects')} />}
              {tab === 'patents' && (
                <Patents items={data.patents} onEdit={onEdit('patents')} onToggleHidden={togglePatentHidden} />
              )}
              {tab === 'tools' && <Tools items={data.tools} onEdit={onEdit('tools')} />}
            </>
          )}
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
            {tab === 'theses' && !authorFilter && (data?.publications ?? []).filter((p) => p.type === 'other').length > 1 && (
              <button type="button" className="admin-fab-btn secondary" onClick={startOrdering}>
                ↔ 순서 바꾸기
              </button>
            )}
            <button type="button" className="admin-fab-btn" onClick={() => setEditing({ key: tab, item: null })}>
              + {EDITORS[tab].label} 추가
            </button>
          </>
        )}
      </AdminFab>

      {editing && (
        <EditModal
          title={editing.item ? `${editor.label} 수정` : `새 ${editor.label} 추가`}
          fields={editor.fields}
          initial={editing.item ?? initialFor(editing.key)}
          uploadName={(v) => v.name || editor.prefix}
          onSave={handleSave}
          onDelete={editing.item ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
