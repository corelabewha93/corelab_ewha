import { useEffect } from 'react'

/**
 * 모바일 양쪽 정렬 다듬기.
 * 좁은 화면에서 긴 영어(예: "Collaborative Research Learning Lab")가 줄 끝에 걸리면
 * 그 줄이 띄어쓰기 몇 군데로만 늘어나 간격이 크게 벌어집니다.
 * 문단마다 자간을 눈에 띄지 않을 만큼(±0.8px 이내) 바꿔 보며 줄바꿈 위치를 시험하고,
 * 줄 끝에 남는 빈 공간이 가장 작은 자간을 골라 씁니다. (PC에서는 아무것도 하지 않습니다)
 */
const CANDIDATES = [0, -0.2, 0.2, -0.4, 0.4, -0.6, 0.6, -0.8, 0.8]
const MOBILE = '(max-width: 700px)'

/**
 * 왼쪽 정렬 상태에서 줄마다 "남는 폭 ÷ 그 줄의 띄어쓰기 수"를 잽니다.
 * 양쪽 정렬을 하면 이만큼씩 띄어쓰기가 더 벌어지므로, 마지막 줄을 뺀 줄들 중 가장 큰 값을 돌려줍니다.
 */
function worstGap(p) {
  const box = p.getBoundingClientRect()
  const rows = new Map()
  const rowOf = (r) => {
    const key = Math.round(r.bottom / 3)
    let row = rows.get(key)
    if (!row) rows.set(key, (row = { left: r.left, right: r.right, spaces: 0 }))
    return row
  }
  const range = document.createRange()
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    range.selectNodeContents(node)
    for (const r of range.getClientRects()) {
      if (!r.width) continue
      const row = rowOf(r)
      row.left = Math.min(row.left, r.left)
      row.right = Math.max(row.right, r.right)
    }
    const t = node.textContent
    for (let i = t.indexOf(' '); i !== -1; i = t.indexOf(' ', i + 1)) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getClientRects()[0]
      if (r && r.width) rowOf(r).spaces++
    }
  }
  const list = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  let worst = 0
  list.slice(0, -1).forEach((row) => {
    const slack = box.right - row.right + (row.left - box.left)
    worst = Math.max(worst, slack / Math.max(1, row.spaces))
  })
  return worst
}

function tune(p, mobile) {
  if (!mobile) {
    p.style.letterSpacing = ''
    return
  }
  let best = 0
  let bestScore = Infinity
  p.style.textAlign = 'left'
  for (const c of CANDIDATES) {
    p.style.letterSpacing = c ? `${c}px` : ''
    // 띄어쓰기가 덜 벌어질수록 좋고, 자간은 0에 가까울수록 좋습니다(1px 바꿀 때마다 띄어쓰기 3px 손해로 셈).
    const score = worstGap(p) + Math.abs(c) * 3
    if (score < bestScore - 0.5) {
      best = c
      bestScore = score
    }
  }
  p.style.letterSpacing = best ? `${best}px` : ''
  p.style.textAlign = ''
}

export function useSmartJustify(ref, selector, deps = []) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const mq = window.matchMedia(MOBILE)
    let frame = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root.querySelectorAll(selector).forEach((p) => tune(p, mq.matches))
      })
    }
    run()
    // 웹폰트가 늦게 도착하면 글자 폭이 바뀌므로 다시 맞춥니다.
    document.fonts?.ready?.then(run)
    document.fonts?.addEventListener?.('loadingdone', run)
    window.addEventListener('resize', run)
    mq.addEventListener?.('change', run)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', run)
      document.fonts?.removeEventListener?.('loadingdone', run)
      mq.removeEventListener?.('change', run)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
