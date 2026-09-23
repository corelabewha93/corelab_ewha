import SafeImage from '../../components/SafeImage'
import { EditButton } from '../../components/admin/AdminControls'

export default function Tools({ items = [], onEdit }) {
  if (items.length === 0) return <p className="empty-state">등록된 시스템/도구가 없습니다.</p>

  return (
    <div className="tools-grid">
      {items.map((tool) => (
        <div key={tool.id} className="card tool-card admin-item">
          <EditButton onClick={() => onEdit(tool)} />
          <div className="tool-image">
            <SafeImage src={tool.image} alt="" fallback={<span />} />
          </div>
          <h3 style={{ margin: '0 0 0.3rem' }}>
            {tool.link ? (
              <a href={tool.link} target="_blank" rel="noreferrer">
                {tool.name}
              </a>
            ) : (
              tool.name
            )}
          </h3>
          {tool.description && <p className="muted" style={{ margin: 0 }}>{tool.description}</p>}
          <div>
            {(tool.tags ?? []).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
