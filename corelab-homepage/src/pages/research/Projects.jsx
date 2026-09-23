function isOngoing(end) {
  if (!end) return true
  const endDate = new Date(`${end}-01`)
  return endDate >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

function formatMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${y}.${m}`
}

export default function Projects({ items = [] }) {
  if (items.length === 0) return <p className="empty-state">등록된 연구과제가 없습니다.</p>

  const sorted = [...items].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''))

  return (
    <div>
      {sorted.map((proj) => {
        const ongoing = isOngoing(proj.end)
        return (
          <div key={proj.id} className="project-item">
            <div className="pub-title" style={{ fontWeight: 600 }}>
              {proj.title}
              <span className={`badge${ongoing ? ' ongoing' : ''}`}>
                {ongoing ? '진행 중' : '종료'}
              </span>
            </div>
            <div className="pub-venue">
              {proj.funder} · {formatMonth(proj.start)} – {proj.end ? formatMonth(proj.end) : '진행 중'}
            </div>
            {proj.description && <p style={{ marginTop: '0.4rem' }}>{proj.description}</p>}
          </div>
        )
      })}
    </div>
  )
}
