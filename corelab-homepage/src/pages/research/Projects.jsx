import { EditButton } from '../../components/admin/AdminControls'
import { PROJECT_MEMBER_ROLES } from '../../admin/schemas'

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

/** 시작~종료 월로 과제 기간(년)을 셉니다. 예: 2021-07 ~ 2024-06 → 3 */
function yearsOf(start, end) {
  if (!start || !end) return null
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const months = (ey - sy) * 12 + (em - sm) + 1
  return months >= 12 ? Math.round(months / 12) : null
}

function formatWon(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return ''
  return `${Number(n).toLocaleString('ko-KR')}원`
}

/** 참여연구진을 신분별로 묶어 정해진 순서(박사후연구원 → 박사과정 → 석사과정 …)로 돌려줍니다. */
function groupMembers(members = []) {
  const order = [...PROJECT_MEMBER_ROLES]
  members.forEach((m) => m.role && !order.includes(m.role) && order.push(m.role))
  return order
    .map((role) => ({ role, names: members.filter((m) => m.name && m.role === role).map((m) => m.name) }))
    .filter((g) => g.names.length > 0)
}

/**
 * Projects — 임규연 교수가 연구책임자인 연구과제.
 * 여러 해에 걸친 연속과제는 한 줄로 묶어, 전체 기간과 총 연구비를 보여줍니다.
 * 왼쪽에는 과제 기간(시작–종료 연도), 오른쪽에는 과제명 · 지원기관 · 사업명/규모 · 연구비 · 참여연구진.
 */
export default function Projects({ items = [], onEdit }) {
  if (items.length === 0) return <p className="empty-state">등록된 연구과제가 없습니다.</p>

  const sorted = [...items].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''))

  return (
    <div className="pubs">
      {sorted.map((proj) => {
        const ongoing = isOngoing(proj.end)
        const sy = proj.start?.slice(0, 4)
        const ey = proj.end?.slice(0, 4)
        const years = yearsOf(proj.start, proj.end)
        const groups = groupMembers(Array.isArray(proj.members) ? proj.members : [])
        return (
          <section key={proj.id} className="pub-year-group project-group">
            <h3 className="pub-year-title project-years">
              {sy}
              {ey && ey !== sy ? <span className="project-years-end">–{ey}</span> : null}
            </h3>
            <div className="project-item admin-item">
              <EditButton onClick={() => onEdit(proj)} />
              <p className="pub-title">
                {proj.title}
                {ongoing ? (
                  <span className="badge ongoing">진행 중</span>
                ) : (
                  <span className="badge badge-done">
                    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false">
                      <path d="M3.2 8.6l3 3 6.6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    종료
                  </span>
                )}
              </p>

              {(proj.funder || proj.program || proj.scale) && (
                <p className="project-line">
                  {proj.funder && <span>{proj.funder}</span>}
                  {proj.funder && proj.program && <span className="project-sep">|</span>}
                  {proj.program && <span>{proj.program}</span>}
                  {proj.scale && <span className="pub-type-tag project-scale">{proj.scale}</span>}
                </p>
              )}

              <p className="project-line project-meta">
                <span>
                  {formatMonth(proj.start)} – {proj.end ? formatMonth(proj.end) : '진행 중'}
                  {years ? ` (${years}년)` : ''}
                </span>
                {proj.budget ? (
                  <>
                    <span className="project-sep">·</span>
                    <span>
                      총 연구비 <strong className="project-budget">{formatWon(proj.budget)}</strong>
                    </span>
                  </>
                ) : null}
              </p>

              {groups.length > 0 && (
                <div className="project-members">
                  <span className="project-members-label">참여연구진</span>
                  <span className="project-members-list">
                    {groups.map((g) => (
                      <span key={g.role} className="project-members-group">
                        <span className="project-members-role">{g.role}</span>
                        {g.names.join(', ')}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {proj.description && (
                <>
                  <p className="project-desc-label">과제 소개</p>
                  <p className="project-desc">{proj.description}</p>
                </>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
