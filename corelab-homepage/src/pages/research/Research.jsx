import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { useHashRoute, useQueryTab } from '../../router/useHashRoute'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { upsertItem, deleteItem } from '../../admin/collection'
import { makeId } from '../../admin/dataStore'
import { publicationFields, projectFields, patentFields, toolFields } from '../../admin/schemas'
import Tabs from '../../components/Tabs'
import EditModal from '../../components/admin/EditModal'
import { AdminFab } from '../../components/admin/AdminControls'
import { useDocumentMeta } from '../../router/useDocumentMeta'
import Publications from './Publications'
import Projects from './Projects'
import Patents from './Patents'
import Tools from './Tools'
import Theses from './Theses'
import AuthorResearch from './AuthorResearch'

const TABS = [
  { key: 'publications', label: 'Publications' },
  { key: 'theses', label: 'Theses' },
  { key: 'projects', label: 'Projects' },
  { key: 'patents', label: 'Patents' },
  { key: 'tools', label: 'Systems & Tools' },
]

const EDITORS = {
  // 학술지 논문 · 학회 발표 · 저역서(type: 'book')가 모두 publications 목록에 함께 저장됩니다.
  publications: { fields: publicationFields, label: '논문', prefix: 'pub', titleOf: (i) => i.title },
  // 학위논문도 같은 목록(publications)에 type: 'other'로 저장되고, Theses 탭에서만 보여줍니다.
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
  const authorName = routeQuery.author ?? ''
  const authorFilter = useMemo(() => {
    if (!authorName) return null
    const everyone = ['faculty', 'students', 'alumni'].flatMap((k) => people?.[k] ?? [])
    const person = everyone.find((p) => p.name === authorName)
    const extra = Array.isArray(person?.pubNames) ? person.pubNames : []
    return { name: authorName, aliases: [authorName, ...extra] }
  }, [authorName, people])
  const { token } = useAdminAuth()
  const [editing, setEditing] = useState(null) // { key, item|null }

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

  const initialFor = (key) =>
    EDITORS[key].defaults?.() ?? (key === 'publications' ? { year: new Date().getFullYear() } : {})

  return (
    <div className="page container">
      <h1 className="section-title">Research</h1>

      <div className="tabs-layout">
        {/* 모아보기 중에는 어떤 탭도 선택된 것으로 표시하지 않습니다. 탭을 누르면 모아보기가 끝납니다. */}
        <Tabs tabs={TABS} current={authorFilter ? '' : tab} onChange={setTab} />

        <div className="tabs-content">
          {loading && !data && <div>불러오는 중...</div>}
          {error && <div className="error-state">{error}</div>}

          {data && authorFilter && (
            <AuthorResearch
              key={authorName}
              data={data}
              author={authorFilter}
              onClear={() => setTab('publications')}
              onEdit={{
                publications: onEdit('publications'),
                theses: onEdit('theses'),
                patents: onEdit('patents'),
              }}
              onToggleHidden={togglePatentHidden}
            />
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
              {tab === 'theses' && <Theses items={data.publications} onEdit={onEdit('theses')} />}
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
        <button type="button" className="admin-fab-btn" onClick={() => setEditing({ key: tab, item: null })}>
          + {EDITORS[tab].label} 추가
        </button>
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
