import { EditButton } from '../../components/admin/AdminControls'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import FocusNames from './FocusNames'
import { useLang } from '../../i18n/LangContext'

/**
 * 등록번호 표기 — 특허청 13자리 번호(예: 1022189730000)나 "10-2218973"을
 * "등록번호 제 10-2218973호 (등록일 2021년 2월 17일)" 형식으로 보여 줍니다 (교수님 요청).
 */
function patentNumber(number = '', date = '', en = false) {
  const raw = String(number).replace(/\s/g, '')
  let core = ''
  const m13 = raw.match(/^(\d{2})(\d{7})\d{4}$/) // 1022189730000 → 10-2218973
  if (m13) core = `${m13[1]}-${m13[2]}`
  else {
    const m = raw.match(/(\d{2})-?(\d{7})/)
    if (m) core = `${m[1]}-${m[2]}`
  }
  if (!core) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').map(Number) : null
  if (en) {
    const dateEn = d ? ` (registered ${new Date(d[0], d[1] - 1, d[2]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })})` : ''
    return `Registration No. ${core}${dateEn}`
  }
  const dateKo = d ? ` (등록일 ${d[0]}년 ${d[1]}월 ${d[2]}일)` : ''
  return `등록번호 제 ${core}호${dateKo}`
}

const STATUS_LABELS = {
  registered: '등록',
  pending: '출원',
}
const STATUS_LABELS_EN = {
  registered: 'Registered',
  pending: 'Filed',
}

/**
 * Patents — 특허 목록.
 * hidden: true 인 특허는 방문자에게 보이지 않습니다. (등록이 확정되지 않은 특허를 잠시 감춰 둘 때)
 * 관리자에게는 흐리게 표시되고, 오른쪽의 "표시하기 / 숨기기" 버튼으로 바로 바꿀 수 있습니다.
 */
export default function Patents({ items = [], onEdit, onToggleHidden, focus = null, authorTool = null }) {
  const { isAdmin } = useAdminAuth()
  const { en, tr, loc } = useLang()

  const visible = isAdmin ? items : items.filter((p) => !p.hidden)
  if (visible.length === 0) return <p className="empty-state">{tr('등록된 특허가 없습니다.', 'No patents yet.')}</p>

  const sorted = [...visible].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div>
      {sorted.map((raw) => {
        // 영어 화면: 영문 특허명이 제목 자리에 오고, 아래 작은 영문 줄은 숨깁니다.
        const pat = loc(raw, 'patents')
        return (
        <div key={pat.id} className={`patent-item admin-item${pat.hidden || authorTool?.isExcluded(pat) ? ' patent-hidden' : ''}`}>
          <EditButton onClick={() => onEdit(raw)} />
          {isAdmin && authorTool && (
            <button
              type="button"
              className={`pub-exclude-btn${authorTool.isExcluded(pat) ? ' is-excluded' : ''}`}
              onClick={() => authorTool.onToggle(raw)}
              title={`${authorTool.name}의 실적이 아닐 때, 이 사람의 모아보기에서만 뺍니다 (전체 특허 목록에는 그대로 남아요)`}
            >
              {authorTool.isExcluded(pat) ? '다시 포함' : '내 실적 아님'}
            </button>
          )}
          {isAdmin && onToggleHidden && (
            <button
              type="button"
              className={`patent-hide-btn${pat.hidden ? ' is-hidden' : ''}`}
              onClick={() => onToggleHidden(raw)}
              title={pat.hidden ? '방문자에게 다시 보이게 합니다' : '방문자에게 보이지 않게 숨깁니다'}
            >
              {pat.hidden ? '표시하기' : '숨기기'}
            </button>
          )}
          <div className="pub-title" style={{ fontWeight: 600 }}>
            {pat.title}{' '}
            <span className={`badge${pat.status === 'registered' ? ' ongoing' : ''}`}>
              {(en ? STATUS_LABELS_EN : STATUS_LABELS)[pat.status] ?? pat.status}
            </span>
            {pat.hidden && <span className="badge badge-hidden">숨김 · 관리자에게만 보임</span>}
            {authorTool?.isExcluded(pat) && (
              <span className="badge badge-hidden">{authorTool.name} 실적에서 제외됨 · 관리자에게만 보임</span>
            )}
          </div>
          {/* 영어 제목은 한글 화면에서 보이지 않습니다 (교수님 요청). 영어 화면에서는 제목 자리에 쓰입니다. */}
          <div className="pub-venue">
            <FocusNames names={pat.inventors ?? []} focus={focus} />
          </div>
          {patentNumber(pat.number, pat.date, en) && <p className="patent-number">{patentNumber(pat.number, pat.date, en)}</p>}
          {pat.description && <p className="patent-desc">{pat.description}</p>}
        </div>
        )
      })}
    </div>
  )
}
