import { EditButton } from '../../components/admin/AdminControls'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import FocusNames from './FocusNames'

const STATUS_LABELS = {
  registered: '등록',
  pending: '출원',
}

/**
 * Patents — 특허 목록.
 * hidden: true 인 특허는 방문자에게 보이지 않습니다. (등록이 확정되지 않은 특허를 잠시 감춰 둘 때)
 * 관리자에게는 흐리게 표시되고, 오른쪽의 "표시하기 / 숨기기" 버튼으로 바로 바꿀 수 있습니다.
 */
export default function Patents({ items = [], onEdit, onToggleHidden, focus = null, authorTool = null }) {
  const { isAdmin } = useAdminAuth()

  const visible = isAdmin ? items : items.filter((p) => !p.hidden)
  if (visible.length === 0) return <p className="empty-state">등록된 특허가 없습니다.</p>

  const sorted = [...visible].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div>
      {sorted.map((pat) => (
        <div key={pat.id} className={`patent-item admin-item${pat.hidden || authorTool?.isExcluded(pat) ? ' patent-hidden' : ''}`}>
          <EditButton onClick={() => onEdit(pat)} />
          {isAdmin && authorTool && (
            <button
              type="button"
              className={`pub-exclude-btn${authorTool.isExcluded(pat) ? ' is-excluded' : ''}`}
              onClick={() => authorTool.onToggle(pat)}
              title={`${authorTool.name}의 실적이 아닐 때, 이 사람의 모아보기에서만 뺍니다 (전체 특허 목록에는 그대로 남아요)`}
            >
              {authorTool.isExcluded(pat) ? '다시 포함' : '내 실적 아님'}
            </button>
          )}
          {isAdmin && onToggleHidden && (
            <button
              type="button"
              className={`patent-hide-btn${pat.hidden ? ' is-hidden' : ''}`}
              onClick={() => onToggleHidden(pat)}
              title={pat.hidden ? '방문자에게 다시 보이게 합니다' : '방문자에게 보이지 않게 숨깁니다'}
            >
              {pat.hidden ? '표시하기' : '숨기기'}
            </button>
          )}
          <div className="pub-title" style={{ fontWeight: 600 }}>
            {pat.title}{' '}
            <span className={`badge${pat.status === 'registered' ? ' ongoing' : ''}`}>
              {STATUS_LABELS[pat.status] ?? pat.status}
            </span>
            {pat.hidden && <span className="badge badge-hidden">숨김 · 관리자에게만 보임</span>}
            {authorTool?.isExcluded(pat) && (
              <span className="badge badge-hidden">{authorTool.name} 실적에서 제외됨 · 관리자에게만 보임</span>
            )}
          </div>
          {pat.titleEn && (
            <p
              className="patent-title-en"
              style={{
                margin: '0.1rem 0 0',
                fontSize: '0.76rem',
                lineHeight: 1.45,
                fontStyle: 'italic',
                color: 'var(--color-text-muted)',
              }}
            >
              {pat.titleEn}
            </p>
          )}
          <div className="pub-venue">
            <FocusNames names={pat.inventors ?? []} focus={focus} />
            {pat.number ? ` · ${pat.number}` : ''}
            {pat.country ? ` (${pat.country})` : ''}
          </div>
          {pat.description && <p className="patent-desc">{pat.description}</p>}
        </div>
      ))}
    </div>
  )
}
