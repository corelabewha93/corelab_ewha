import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * 모바일 양쪽 정렬 문단 — 띄어쓰기가 산만해 보이지 않게 하는 컴포넌트.
 *
 * 배경: 좁은 화면에서 한글을 어절 단위(keep-all)로 줄바꿈하며 양쪽 정렬하면,
 *       긴 어절이 다음 줄로 넘어간 줄은 남는 공간이 단어 사이 몇 군데에만 몰려 크게 벌어집니다.
 *       반대로 글자 단위로 줄바꿈하면 어절이 아무 데서나 쪼개져 읽기 어렵고,
 *       "글자 사이 정렬(inter-character)"은 아이폰(사파리) 등 일부 브라우저가 지원하지 않습니다.
 *
 * 방법: 평소에는 어절을 쪼개지 않고(keep-all) 단어 사이로만 정렬합니다.
 *       다만 어느 줄의 단어 간격이 너무 벌어질 것 같으면, 그 줄 끝에서 밀려난 '긴 어절' 하나만
 *       글자 사이에서 끊어도 되게(<wbr>) 열어 줘서 줄이 알맞게 채워지도록 합니다.
 *       → 대부분의 어절은 그대로이고, 꼭 필요한 곳만 쪼개집니다.
 * PC(701px 이상)와 영문 화면은 이전과 똑같이 동작합니다.
 */

const NARROW_QUERY = '(max-width: 700px)'
const HANGUL = /[가-힣]/
const HANGUL_ONE = /[가-힣]/
/** 줄의 단어 사이가 (기본 띄어쓰기보다) 글자 크기의 이만큼 넘게 더 벌어질 것 같으면 어절을 연다 */
const LOOSE_EM = 0.4
/** 간격이 이만큼(글자 크기 대비) 넘게 벌어질 땐, 다음 줄 첫머리에 한 글자만 남는 끊김도 허용한다 */
const VERY_LOOSE_EM = 0.6
/** 끊을 때 앞·뒤에 최소한 남길 글자 수 (한 글자만 덩그러니 남는 끊김은 피한다) */
const MIN_PART = 2

let _canvas
const _cache = new Map()
function measure(font, str) {
  const key = font + '|' + str
  const hit = _cache.get(key)
  if (hit !== undefined) return hit
  _canvas ||= document.createElement('canvas').getContext('2d')
  _canvas.font = font
  const w = _canvas.measureText(str).width
  if (_cache.size > 4000) _cache.clear()
  _cache.set(key, w)
  return w
}

/** 어절 안에서 끊을 수 있는 자리(앞쪽 글자 수) 목록: 양옆이 모두 한글 음절인 곳 */
function breakPoints(word, minTail = MIN_PART) {
  const pts = []
  for (let p = MIN_PART; p <= word.length - minTail; p++) {
    if (HANGUL_ONE.test(word[p - 1]) && HANGUL_ONE.test(word[p])) pts.push(p)
  }
  return pts
}

/** 글을 줄 단위로 흉내 내 보면서, 열어 줘야 할 어절 번호들을 찾는다 */
function planOpen(text, width, font, fontSize) {
  const open = new Map() // 토큰 번호 -> 끊을 수 있는 자리들
  const tokens = text.split(/(\s+)/)
  const sp = measure(font, ' ')
  let x = 0
  let gaps = 0
  let empty = true
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (!tok) continue
    if (i % 2 === 1) {
      if (tok.includes('\n')) { x = 0; gaps = 0; empty = true }
      continue
    }
    const w = measure(font, tok)
    if (empty) { x = w; gaps = 0; empty = false; continue }
    if (x + sp + w <= width + 0.5) { x += sp + w; gaps += 1; continue }

    // 이 어절이 다음 줄로 밀려난다. 지금 줄이 얼마나 벌어질지 본다.
    const extra = (width - x) / Math.max(gaps, 0.0001)
    if (extra > LOOSE_EM * fontSize) {
      // 앞은 늘 2글자 이상. 뒤에 한 글자만 남기는 끊김은 간격이 아주 벌어질 때만 허용
      const pts = breakPoints(tok, extra > VERY_LOOSE_EM * fontSize ? 1 : MIN_PART)
      let best = -1
      for (const p of pts) {
        if (x + sp + measure(font, tok.slice(0, p)) <= width + 0.5) best = p
      }
      if (best > 0) {
        open.set(i, pts)
        x = measure(font, tok.slice(best))
        gaps = 0
        empty = false
        continue
      }
    }
    x = w
    gaps = 0
  }
  return open
}

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

function render(text, open) {
  if (!open || open.size === 0) return text
  const tokens = text.split(/(\s+)/)
  const out = []
  tokens.forEach((tok, i) => {
    const pts = open.get(i)
    if (!pts) {
      out.push(tok)
      return
    }
    let prev = 0
    pts.forEach((p) => {
      out.push(tok.slice(prev, p), <wbr key={`${i}-${p}`} />)
      prev = p
    })
    out.push(tok.slice(prev))
  })
  return out
}

export default function SoftJustify({ text, as: Tag = 'p', className = '', ...rest }) {
  const narrow = useNarrow()
  const active = narrow && HANGUL.test(text)
  const ref = useRef(null)
  const [plan, setPlan] = useState({ text: '', open: null })

  useEffect(() => {
    const el = ref.current
    if (!active || !el) return undefined
    let lastW = -1
    const run = (force) => {
      const cs = getComputedStyle(el)
      const width = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (!(width > 0)) return
      if (!force && Math.abs(width - lastW) < 0.5) return
      lastW = width
      const fontSize = parseFloat(cs.fontSize)
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const open = planOpen(text, width, font, fontSize)
      flushSync(() => setPlan((prev) => {
        if (prev.text === text && sameOpen(prev.open, open)) return prev
        return { text, open }
      }))
    }
    // 크기가 바뀔 때마다(첫 표시 포함) 그림이 그려지기 전에 바로 다시 계산한다
    const ro = new ResizeObserver(() => run(false))
    ro.observe(el)
    const fonts = document.fonts
    if (fonts?.ready) fonts.ready.then(() => { _cache.clear(); run(true) })
    return () => ro.disconnect()
  }, [active, text])

  const open = active && plan.text === text ? plan.open : null
  const cls = `${className}${active ? ' sj' : ''}`.trim()
  return (
    <Tag ref={ref} className={cls || undefined} {...rest}>
      {render(text, open)}
    </Tag>
  )
}

function sameOpen(a, b) {
  if (a === b) return true
  if (!a || !b || a.size !== b.size) return false
  for (const k of b.keys()) if (!a.has(k)) return false
  return true
}
