import { useMemo } from 'react'
import { groupByYear, YearGroups } from './Publications'

/**
 * Dissertations — 연구실에서 나온 석·박사 학위논문.
 * research.json의 publications 중 type이 'other'인 항목을 연도별로 보여줍니다.
 * (제목 끝의 "(석사학위논문)" / "(박사학위논문)" 표시는 그대로 보입니다.)
 * 건수 통계·검색창·Ph.D./M.A. 구분 버튼 없이, 연도별 목록만 간결하게 보여줍니다.
 *
 * order: 관리자가 "순서 바꾸기" 중일 때, 학위논문 id를 원하는 순서로 담은 배열 (아니면 null)
 * onMove(id, dir): 같은 연도 안에서 한 칸 위(-1)/아래(1)로 옮길 때 새 순서를 돌려받는 함수
 */

/** 같은 연도 안에서 한 칸 위/아래로 옮긴 새 id 순서 */
export function moveThesisWithinYear(list, ids, id, dir) {
  const byId = new Map(list.map((p) => [p.id, p]))
  const yearOf = (x) => byId.get(x)?.year ?? '기타'
  const y = yearOf(id)
  const same = ids.filter((x) => yearOf(x) === y)
  const i = same.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= same.length) return ids
  ;[same[i], same[j]] = [same[j], same[i]]
  let k = 0
  return ids.map((x) => (yearOf(x) === y ? same[k++] : x))
}

export default function Theses({ items = [], onEdit, focus = null, authorTool = null, order = null, onMove = null }) {
  const theses = useMemo(() => {
    const all = items.filter((p) => p.type === 'other')
    if (!order) return all
    const byId = new Map(all.map((p) => [p.id, p]))
    const ordered = order.map((id) => byId.get(id)).filter(Boolean)
    all.forEach((p) => !order.includes(p.id) && ordered.push(p))
    return ordered
  }, [items, order])
  const byYear = useMemo(() => groupByYear(theses), [theses])

  if (theses.length === 0) return <p className="empty-state">등록된 학위논문이 없습니다.</p>

  const reorderFor =
    order && onMove
      ? (pub) => {
          const same = theses.filter((p) => (p.year ?? '기타') === (pub.year ?? '기타'))
          const i = same.findIndex((p) => p.id === pub.id)
          return { canPrev: i > 0, canNext: i < same.length - 1, move: (dir) => onMove(pub.id, dir) }
        }
      : null

  return (
    <div className="pubs">
      <YearGroups
        groups={byYear}
        onEdit={onEdit}
        terms={[]}
        focus={focus}
        authorTool={authorTool}
        reorderFor={reorderFor}
      />
    </div>
  )
}
