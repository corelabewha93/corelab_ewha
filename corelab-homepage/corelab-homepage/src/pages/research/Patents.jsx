import { EditButton } from '../../components/admin/AdminControls'

const STATUS_LABELS = {
  registered: '등록',
  pending: '출원',
}

export default function Patents({ items = [], onEdit }) {
  if (items.length === 0) return <p className="empty-state">등록된 특허가 없습니다.</p>

  const sorted = [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div>
      {sorted.map((pat) => (
        <div key={pat.id} className="patent-item admin-item">
          <EditButton onClick={() => onEdit(pat)} />
          <div className="pub-title" style={{ fontWeight: 600 }}>
            {pat.title}
            <span className={`badge${pat.status === 'registered' ? ' ongoing' : ''}`}>
              {STATUS_LABELS[pat.status] ?? pat.status}
            </span>
          </div>
          <div className="pub-venue">
            {(pat.inventors ?? []).join(', ')}
            {pat.number ? ` · ${pat.number}` : ''}
            {pat.country ? ` (${pat.country})` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
