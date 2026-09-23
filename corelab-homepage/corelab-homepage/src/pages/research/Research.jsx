import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { useQueryTab } from '../../router/useHashRoute'
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

const TABS = [
  { key: 'publications', label: 'Publications' },
  { key: 'projects', label: 'Projects' },
  { key: 'patents', label: 'Patents' },
  { key: 'tools', label: 'Systems & Tools' },
]

const EDITORS = {
  publications: { fields: publicationFields, label: '논문', prefix: 'pub', titleOf: (i) => i.title },
  projects: { fields: projectFields, label: '연구과제', prefix: 'proj', titleOf: (i) => i.title },
  patents: { fields: patentFields, label: '특허', prefix: 'pat', titleOf: (i) => i.title },
  tools: { fields: toolFields, label: '시스템/도구', prefix: 'tool', titleOf: (i) => i.name },
}

export default function Research() {
  const { data, error, loading } = useData('research.json')
  const [tab, setTab] = useQueryTab('/research', TABS.map((t) => t.key), 'publications')
  const { token } = useAdminAuth()
  const [editing, setEditing] = useState(null) // { key, item|null }

  const onEdit = (key) => (item) => setEditing({ key, item })
  const editor = editing && EDITORS[editing.key]

  const handleSave = async (values) => {
    const { key, item: original } = editing
    const item = { ...values, id: original?.id ?? makeId(EDITORS[key].prefix) }
    const verb = original ? '수정' : '추가'
    await upsertItem(token, 'research.json', key, item, `${EDITORS[key].label} ${verb}: ${EDITORS[key].titleOf(item)}`)
  }

  const handleDelete = async () => {
    const { key, item } = editing
    await deleteItem(token, 'research.json', key, item.id, `${EDITORS[key].label} 삭제: ${EDITORS[key].titleOf(item)}`)
  }

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
              {tab === 'publications' && <Publications items={data.publications} onEdit={onEdit('publications')} />}
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
          initial={editing.item ?? (editing.key === 'publications' ? { year: new Date().getFullYear() } : {})}
          uploadName={(v) => v.name || editor.prefix}
          onSave={handleSave}
          onDelete={editing.item ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
