import SafeImage from '../../components/SafeImage'
import { EditButton } from '../../components/admin/AdminControls'
import { useLang } from '../../i18n/LangContext'

export default function Tools({ items = [], onEdit }) {
  const { tr, loc } = useLang()
  if (items.length === 0) return <p className="empty-state">{tr('등록된 시스템/도구가 없습니다.', 'No systems or tools yet.')}</p>

  return (
    <div className="tools-grid">
      {items.map((raw) => {
        const tool = loc(raw, 'tools')
        return (
        <div key={tool.id} className="card tool-card admin-item">
          <EditButton onClick={() => onEdit(raw)} />
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
          {tool.acknowledgement && <p className="tool-ack">{tool.acknowledgement}</p>}
          <div>
            {(tool.tags ?? []).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
        )
      })}
    </div>
  )
}
