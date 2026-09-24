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
import Publications from './Publications'
import Projects from './Projects'
import Patents from './Patents'
import Tools from './Tools'
import Books from './Books'

const TABS = [
  { key: 'publications', label: 'Publications' },
  { key: 'books', label: 'Books' },
  { key: 'projects', label: 'Projects' },
  { key: 'patents', label: 'Patents' },
  { key: 'tools', label: 'Systems & Tools' },
]

const EDITORS = {
  publications: { fields: publicationFields, label: '논문', prefix: 'pub', titleOf: (i) => i.title },
  // 저역서는 논문 목록(publications)에 type: 'book'으로 함께 저장됩니다.
  books: {
    fields: publicationFields,
    label: '저역서',
    prefix: 'pub',
    titleOf: (i) => i.title,
    dataKey: 'publications',
    defaults: () => ({ type: 'book', year: new Date().getFullYear() }),
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

  // People 페이지의 "OOO의 논문 보기" 링크(#/research?tab=publications&author=이름)로 들어오면
  // 그 사람이 저자로 들어간 논문만 모아 보여줍니다. people.json에 적어둔 영문 표기(pubNames)도 함께 찾습니다.
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

  const initialFor = (key) =>
    EDITORS[key].defaults?.() ?? (key === 'publications' ? { year: new Date().getFullYear() } : {})

  return (
    <div className="page container">
      <h1 className="section-title">Research</h1>

      <div className="tabs-layout">
        <Tabs tabs={TABS} current={tab} onChange={setTab} />

        <div className="tabs-content">
          {loading && !data && <div>불러오는 중...</div>}
          {error && <div className="error-state">{error}</div>}

          {data && (
            <>
              {tab === 'publications' && (
                <Publications
                  key={`${authorName}|${searchQuery}`}
                  items={data.publications}
                  onEdit={onEdit('publications')}
                  initialQuery={searchQuery}
                  authorFilter={authorFilter}
                  onClearAuthor={() => setTab('publications')}
                />
              )}
              {tab === 'books' && <Books items={data.publications} onEdit={onEdit('books')} />}
              {tab === 'projects' && <Projects items={data.projects} onEdit={onEdit('projects')} />}
              {tab === 'patents' && <Patents items={data.patents} onEdit={onEdit('patents')} />}
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
