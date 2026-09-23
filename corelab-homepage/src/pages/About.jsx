import { useData } from '../hooks/useData'

export default function About() {
  const { data, error, loading } = useData('site.json')

  if (loading) return <div className="page container">불러오는 중...</div>
  if (error) return <div className="page container error-state">{error}</div>

  const { labNameFull, university, overview = [], researchAreas = [], contact = {} } = data ?? {}

  return (
    <div className="page container">
      <section className="section">
        <h1 className="section-title">Lab Overview</h1>
        {labNameFull && (
          <p className="muted" style={{ marginTop: '-0.5rem' }}>
            {labNameFull}
            {university ? ` · ${university}` : ''}
          </p>
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

      <section className="section" id="contact">
        <h2 className="section-title">Contact</h2>
        <div className="contact-box">
          {contact.address && (
            <div className="contact-row">
              <span className="contact-label">Address</span>
              <span>{contact.address}</span>
            </div>
          )}
          {contact.email && (
            <div className="contact-row">
              <span className="contact-label">Email</span>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </div>
          )}
          {contact.phone && (
            <div className="contact-row">
              <span className="contact-label">Phone</span>
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.mapUrl && (
            <div className="contact-row">
              <span className="contact-label">Map</span>
              <a href={contact.mapUrl} target="_blank" rel="noreferrer">
                지도에서 보기
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
