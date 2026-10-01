import { useEffect, useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { saveData } from '../admin/dataStore'
import { siteIntroFields } from '../admin/schemas'
import EditModal from '../components/admin/EditModal'
import { EditButton } from '../components/admin/AdminControls'
import SafeImage from '../components/SafeImage'
import Link from '../router/Link'
import { useHashRoute } from '../router/useHashRoute'
import { scrollToSection } from '../router/scrollToSection'
import HeroIntro from '../components/HeroIntro'

function NewsPreview() {
  const { data } = useData('news.json')
  // 숨긴 소식은 홈 화면 미리보기에 넣지 않습니다.
  const items = (data ?? []).filter((i) => !i.hidden).slice(0, 3)

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
  const { query } = useHashRoute()
  const ready = !(loading && !data)

  // 다른 페이지에서 About을 눌러 들어오면(/?section=overview) Lab Overview로 내려갑니다.
  // (페이지가 바뀔 때 App이 맨 위로 올리는 동작이 끝난 뒤에 이동하도록 잠깐 기다립니다.)
  useEffect(() => {
    if (!ready || query.section !== 'overview') return
    const t = setTimeout(() => scrollToSection('overview'), 80)
    return () => clearTimeout(t)
  }, [ready, query.section])

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

        <section className="section" id="overview">
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
