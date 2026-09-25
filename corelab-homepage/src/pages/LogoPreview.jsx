import { useData } from '../hooks/useData'
import SafeImage from '../components/SafeImage'
import CoreLogo from '../components/CoreLogo'
import Link from '../router/Link'
import '../styles/logo-preview.css'

/**
 * [임시] 테스트 홈 화면 — 주소: #/logo-preview
 * 현재 홈 화면(About.jsx)을 그대로 옮기고, 마지막에 뜨는 "CoRe Lab"의 "CoRe"만 로고로 바꿨습니다.
 * 메뉴에는 연결되어 있지 않고, 실제 홈 화면은 전혀 바뀌지 않습니다. (편집 버튼도 없는 보기 전용)
 * 확정 후에는 이 파일, logo-preview.css, App.jsx의 '/logo-preview' 줄을 지우면 깨끗하게 사라집니다.
 */

function heroKeyword(area) {
  const m = area.match(/\(([^)]+)\)\s*$/)
  return m ? m[1] : area
}

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

/** labName("CoRe Lab")에서 "CoRe"만 로고로, 나머지("Lab")는 글자 그대로 */
function FinalLogo({ labName }) {
  const rest = (labName ?? 'CoRe Lab').replace(/^\s*CoRe\s*/i, '')
  return (
    <h1 className="hero-final-logo lp-final-logo" aria-label={labName}>
      {/* 기존 로고 문구가 뜨는 시각(4.15초)에 맞춰 로고의 움직임이 시작됩니다 */}
      <CoreLogo animated tone="dark" delay={4.15} className="lp-final-mark" />
      {rest && <span className="lp-final-rest">{rest}</span>}
    </h1>
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

export default function LogoPreview() {
  const { data, error, loading } = useData('site.json')

  if (loading && !data) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const { labName, mottoKr, mottoEn, heroAffiliation = [], overview = [], researchAreas = [] } = data ?? {}

  return (
    <div className="page page-home container">
      <section className="hero-sequence">
        <p className="lp-badge">테스트 홈 화면</p>

        {researchAreas.length > 0 && (
          <ul className="hero-kw-fall" aria-hidden="true">
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

          <FinalLogo labName={labName} />
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

      <NewsPreview />
    </div>
  )
}
