import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { saveData } from '../admin/dataStore'
import { siteIntroFields } from '../admin/schemas'
import EditModal from '../components/admin/EditModal'
import { EditButton } from '../components/admin/AdminControls'
import SafeImage from '../components/SafeImage'
import Link from '../router/Link'

/** 연구 분야 태그가 "Computer-Supported Collaborative Learning (CSCL)"처럼 길면,
 *  히어로 키워드 목록에서는 괄호 속 약어만 크게 보여줍니다. */
function heroKeyword(area) {
  const m = area.match(/\(([^)]+)\)\s*$/)
  return m ? m[1] : area
}

/** "CoRe Lab"에서 "CoRe" 부분만 강조색으로 표시합니다. (랩 이름이 CoRe로 시작하지 않으면 그대로) */
function renderLabName(name) {
  const m = name.match(/^(\s*CoRe)(.*)$/i)
  if (!m) return name
  return (
    <>
      <span className="hero-final-core">{m[1]}</span>
      {m[2]}
    </>
  )
}

/** 모토 문구 속 "visible" 부분(Invisible의 뒷부분 + Visible)만 강조색으로 표시해,
 *  "Invisible → Visible"로 바뀌는 느낌을 색 변화로 보여줍니다. */
function renderMotto(text) {
  if (!text) return null
  return text.split(/(visible)/gi).map((part, i) =>
    /^visible$/i.test(part) ? (
      <span key={i} className="hero-motto-accent">
        {part}
      </span>
    ) : (
      part
    )
  )
}

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

  const { labName, mottoKr, mottoEn, heroAffiliation = [], overview = [], researchAreas = [] } = data ?? {}

  const handleSave = (values) =>
    saveData(token, 'site.json', (d) => ({ ...d, ...values }), '홈 소개글 수정')

  return (
    <div className="page page-home container">
      <div className="admin-item">
        <EditButton onClick={() => setEditing(true)} label="소개 내용 수정" />

        <section className="hero-sequence">
          {researchAreas.length > 0 && (
            <ul
              className="hero-kw-fall"
              aria-hidden="true"
              /* 가장 긴 키워드 글자 수 → CSS에서 화면 높이에 맞춰 글자 크기를 제한하는 데 씁니다 (양 끝 키워드 잘림 방지) */
              style={{ '--kw-chars': Math.max(...researchAreas.map((kw) => heroKeyword(kw).length)) }}
            >
              {researchAreas.map((kw, i) => (
                <li key={kw} className="hero-kw-fall-item" style={{ '--i': i }}>
                  <span className="hero-kw-fall-text">{heroKeyword(kw)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="hero-sequence-content">
            {mottoEn && <p className="hero-motto-reveal">{renderMotto(mottoEn)}</p>}

            {heroAffiliation.length > 0 && (
              <div className="hero-affiliation">
                {heroAffiliation.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}

            {labName && <h1 className="hero-final-logo">{renderLabName(labName)}</h1>}
          </div>
        </section>

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
