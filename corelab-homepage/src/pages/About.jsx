import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { saveData } from '../admin/dataStore'
import { siteIntroFields } from '../admin/schemas'
import EditModal from '../components/admin/EditModal'
import { EditButton } from '../components/admin/AdminControls'
import SafeImage from '../components/SafeImage'
import Link from '../router/Link'
import HeroIntro from '../components/HeroIntro'

function NewsPreview() {
  const { data } = useData('news.json')
  const items = (data ?? []).slice(0, 3)

  if (items.length === 0) return null

  return (
    <section className="section news-preview">
      <div className="news-preview-head">
        <h2 className="section-title">Latest News</h2>
        <Link to="/news" className="news-preview-more">
          News 더보기 →
        </Link>
      </div>
      <div className="news-preview-grid">
        {items.map((item) => {
          const thumb = Array.isArray(item.images) ? item.images[0] : item.images || item.thumbnail
          return (
            <Link key={item.id} to={`/news?id=${item.id}`} className="news-preview-card">
              <div className="news-preview-thumb">
                <SafeImage src={thumb} alt="" fallback={<span />} />
              </div>
              <h3 className="title">{item.title}</h3>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function About() {
  const { data, error, loading } = useData('site.json')
  const { token } = useAdminAuth()
  const [editing, setEditing] = useState(false)

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const { labName = '', labTagline = '', mottoKr, mottoEn, heroAffiliation = [], overview = [], researchAreas = [] } = data ?? {}

  const handleSave = (values) =>
    saveData(token, 'site.json', (d) => ({ ...d, ...values }), '홈 소개글 수정')

  return (
    <div className="page page-home container">
      <div className="admin-item">
        <EditButton onClick={() => setEditing(true)} label="소개 내용 수정" />

        <HeroIntro
          labName={labName}
          tagline={labTagline}
          affiliation={heroAffiliation}
          motto={mottoEn}
        />

        <section className="section">
          <h2 className="section-title">Lab Overview</h2>

          {(mottoKr || mottoEn) && (
            <div className="lab-motto">
              {mottoKr && <p className="lab-motto-kr">{mottoKr}</p>}
              {mottoEn && <p className="lab-motto-en">{mottoEn}</p>}
            </div>
          )}

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

      <NewsPreview />

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
