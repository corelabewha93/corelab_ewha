import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { saveData } from '../admin/dataStore'
import { siteIntroFields } from '../admin/schemas'
import EditModal from '../components/admin/EditModal'
import { EditButton } from '../components/admin/AdminControls'

export default function About() {
  const { data, error, loading } = useData('site.json')
  const { token } = useAdminAuth()
  const [editing, setEditing] = useState(false)

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const { labName, labTagline, university, overview = [], researchAreas = [] } = data ?? {}

  const handleSave = (values) =>
    saveData(token, 'site.json', (d) => ({ ...d, ...values }), '홈 소개글 수정')

  return (
    <div className="page container">
      <div className="admin-item">
        <EditButton onClick={() => setEditing(true)} label="소개 내용 수정" />

        <section className="section hero">
          {university && <p className="hero-eyebrow">{university}</p>}
          {labName && <h1 className="hero-title">{labName}</h1>}
          {labTagline && <p className="hero-subtitle">{labTagline}</p>}
          <div className="hero-rule" />
        </section>

        <section className="section">
          <h2 className="section-title">Lab Overview</h2>
          {overview.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}

          {researchAreas.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              {researchAreas.map((area) => (
                <span key={area} className="tag" style={{ marginBottom: '0.4rem' }}>
                  {area}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <EditModal
          title="홈 소개 내용 수정"
          fields={siteIntroFields}
          initial={data ?? {}}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
