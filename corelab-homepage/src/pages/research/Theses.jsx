import { useMemo } from 'react'
import { groupByYear, YearGroups } from './Publications'

/**
 * Dissertations — 연구실에서 나온 석·박사 학위논문.
 * research.json의 publications 중 type이 'other'인 항목을 연도별로 보여줍니다.
 * (제목 끝의 "(석사학위논문)" / "(박사학위논문)" 표시는 그대로 보입니다.)
 * 건수 통계·검색창·Ph.D./M.A. 구분 버튼 없이, 연도별 목록만 간결하게 보여줍니다.
 */
export default function Theses({ items = [], onEdit, focus = null, authorTool = null }) {
  const theses = useMemo(() => items.filter((p) => p.type === 'other'), [items])
  const byYear = useMemo(() => groupByYear(theses), [theses])

  if (theses.length === 0) return <p className="empty-state">등록된 학위논문이 없습니다.</p>

  return (
    <div className="pubs">
      <YearGroups groups={byYear} onEdit={onEdit} terms={[]} focus={focus} authorTool={authorTool} />
    </div>
  )
}
