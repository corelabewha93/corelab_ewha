import { useMemo, useState } from 'react'
import { useData } from '../hooks/useData'
import { useQueryTab } from '../router/useHashRoute'
import { useAdminAuth } from '../admin/AdminAuthContext'
import Tabs from '../components/Tabs'
import PersonCard from '../components/PersonCard'
import AdminRegisterModal from '../components/AdminRegisterModal'

const TABS = [
  { key: 'faculty', label: 'Faculty' },
  { key: 'students', label: 'Students' },
  { key: 'alumni', label: 'Alumni' },
]

function StudentsList({ items = [], isAdmin, onEdit }) {
  const groups = useMemo(() => {
    const order = ['PhD', 'Integrated', 'MA']
    const byDegree = {}
    items.forEach((s) => {
      const d = s.degree ?? 'MA'
      if (!byDegree[d]) byDegree[d] = []
      byDegree[d].push(s)
    })
    return order.filter((d) => byDegree[d]).map((d) => [d, byDegree[d]])
  }, [items])

  if (items.length === 0) return <p className="empty-state">등록된 학생이 없습니다.</p>

  return (
    <>
      {groups.map(([degree, students]) => (
        <div key={degree}>
          <h3 className="people-group-title">{degree}</h3>
          <div className="people-grid">
            {students.map((s) => (
              <PersonCard
                key={s.id}
                person={s}
                positionLabel={s.admission ? `${s.admission}학번` : ''}
                isAdmin={isAdmin}
                onEdit={() => onEdit(s, 'students')}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export default function People() {
  const { data, error, loading } = useData('people.json')
  const [tab, setTab] = useQueryTab('/people', TABS.map((t) => t.key), 'faculty')
  const { isAdmin } = useAdminAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // { person, category } | null

  const alumniSorted = useMemo(() => {
    if (!data?.alumni) return []
    return [...data.alumni].sort((a, b) => (b.graduation ?? '').localeCompare(a.graduation ?? ''))
  }, [data])

  const openEdit = (person, category) => setEditTarget({ person, category })
  const closeModal = () => {
    setShowRegister(false)
    setEditTarget(null)
  }

  return (
    <div className="page container">
      <h1 className="section-title">People</h1>

      <div className="tabs-layout">
        <Tabs tabs={TABS} current={tab} onChange={setTab} />

        <div className="tabs-content">
          {loading && <div>불러오는 중...</div>}
          {error && <div className="error-state">{error}</div>}

          {data && (
            <>
              {tab === 'faculty' && (
                <div className="people-grid">
                  {(data.faculty ?? []).length === 0 ? (
                    <p className="empty-state">등록된 교수진이 없습니다.</p>
                  ) : (
                    data.faculty.map((f) => (
                      <PersonCard
                        key={f.id}
                        person={f}
                        positionLabel={f.position}
                        isAdmin={isAdmin}
                        onEdit={() => openEdit(f, 'faculty')}
                      />
                    ))
                  )}
                </div>
              )}

              {tab === 'students' && (
                <StudentsList items={data.students} isAdmin={isAdmin} onEdit={openEdit} />
              )}

              {tab === 'alumni' && (
                <div className="people-grid">
                  {alumniSorted.length === 0 ? (
                    <p className="empty-state">등록된 졸업생이 없습니다.</p>
                  ) : (
                    alumniSorted.map((a) => (
                      <PersonCard
                        key={a.id}
                        person={a}
                        positionLabel={a.graduation ? `${a.graduation} 졸업` : ''}
                        isAdmin={isAdmin}
                        onEdit={() => openEdit(a, 'alumni')}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <button type="button" className="admin-fab" onClick={() => setShowRegister(true)}>
          + 등록
        </button>
      )}

      {showRegister && <AdminRegisterModal initialCategory={tab} onClose={closeModal} />}

      {editTarget && (
        <AdminRegisterModal
          editPerson={editTarget.person}
          editCategory={editTarget.category}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
