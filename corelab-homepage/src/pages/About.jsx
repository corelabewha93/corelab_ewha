import { useData } from '../hooks/useData'

export default function About() {
  const { data, error, loading } = useData('site.json')

  if (loading) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const { labName, labTagline, university, overview = [], researchAreas = [] } = data ?? {}

  return (
    <div className="page container">
      <section className="section hero">
        {labName && <h1 className="hero-title">{labName}</h1>}
        {(labTagline || university) && (
          <p className="hero-subtitle">
            {labTagline}
            {labTagline && university ? ' · ' : ''}
            {university}
          </p>
        )}
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
  )
}
