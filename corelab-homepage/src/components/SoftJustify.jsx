import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * 모바일 양쪽 정렬 문단 — 띄어쓰기가 산만해 보이지 않게 하는 컴포넌트.
 *
 * 배경: 좁은 화면에서 한글을 어절 단위(keep-all)로 줄바꿈하며 양쪽 정렬하면,
 *       긴 어절이 다음 줄로 넘어간 줄은 남는 공간이 단어 사이 몇 군데에만 몰려 크게 벌어집니다.
 *       반대로 글자 단위로 줄바꿈하면 어절이 아무 데서나 쪼개져 읽기 어렵고,
 *       "글자 사이 정렬(inter-character)"은 브라우저마다 지원이 달라 믿고 쓸 수 없습니다.
 *
 * 방법: 평소에는 어절을 쪼개지 않고(keep-all) 단어 사이로만 정렬합니다.
 *       그런 다음 실제로 그려진 줄을 위에서부터 하나씩 재 보고,
 *       단어 사이가 지나치게 벌어진 줄이 있으면 그 줄에서 밀려난 '다음 어절' 하나만
 *       글자 사이에서 끊어도 되게(<wbr>) 열어 줘서 줄이 알맞게 채워지게 합니다.
 *       (예측이 아니라 실제 화면 기준이라, 폰트·기기가 달라도 그대로 맞습니다.)
 * PC(701px 이상)와 영문 화면은 이전과 똑같이 동작합니다.
 */

const NARROW_QUERY = '(max-width: 700px)'
const HANGUL = /[가-힣]/
const DIGIT = /[0-9]/
/** 단어 사이 간격이 글자 크기의 이 배수를 넘으면 '벌어졌다'고 본다 (기본 띄어쓰기는 약 0.27배) */
const GAP_LOOSE = 0.62
/** 이만큼 넘게 벌어지면, 뒤에 한 글자만 남기거나 숫자·한글 경계에서 끊는 것도 허용 */
const GAP_VERY_LOOSE = 0.95
const MAX_STEPS = 60
/** 글자 사이를 벌리는 최대치(글자 크기 배). 이 정도면 눈에 거의 띄지 않는다 */
const MAX_LS = 0.06
/** 간격이 특히 심하게(이 배수 이상) 벌어진 줄에는 조금 더 허용 */
const MAX_LS_WIDE = 0.1

/**
 * 어절 안에서 끊을 수 있는 자리(앞쪽 글자 수).
 * level 1: 양옆이 한글이고 앞·뒤 모두 2글자 이상
 * level 2: 앞 2글자 이상·뒤 1글자 이상, 숫자와 한글 사이도 허용
 */
function breakPoints(word, level) {
  const minTail = level >= 2 ? 1 : 2
  const pts = []
  for (let p = 2; p <= word.length - minTail; p++) {
    const a = word[p - 1]
    const b = word[p]
    const hh = HANGUL.test(a) && HANGUL.test(b)
    const dh = level >= 2 && ((DIGIT.test(a) && HANGUL.test(b)) || (HANGUL.test(a) && DIGIT.test(b)))
    if (hh || dh) pts.push(p)
  }
  return pts
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

function render(text, levels, spacing) {
  if ((!levels || levels.size === 0) && (!spacing || spacing.size === 0)) return text
  const tokens = text.split(/(\s+)/)
  const out = []
  tokens.forEach((tok, i) => {
    const level = levels?.get(i)
    let piece = tok
    if (level && level <= 2) {
      const parts = []
      let prev = 0
      breakPoints(tok, level).forEach((p) => {
        parts.push(tok.slice(prev, p), <wbr key={`${i}-${p}`} />)
        prev = p
      })
      parts.push(tok.slice(prev))
      piece = parts
    }
    const ls = spacing?.get(i)
    out.push(ls ? <span key={`s${i}`} style={{ letterSpacing: `${ls}em` }}>{piece}</span> : piece)
  })
  return out
}

/**
 * 지금 그려진 문단의 줄들을 분석한다. (마지막 줄·줄바꿈으로 끝나는 줄은 정렬되지 않으므로 제외)
 * 줄마다: gap(가장 큰 단어 사이, 글자 크기 배), nextI/nextFirst(다음 줄 첫 어절), toks(이 줄에 통째로 들어 있는 어절들)
 */
function analyze(el, text) {
  const fs = parseFloat(getComputedStyle(el).fontSize)
  const tokens = text.split(/(\s+)/)
  const starts = []
  let off = 0
  for (const t of tokens) { starts.push(off); off += t.length }

  const nodes = []
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let acc = 0
  while (tw.nextNode()) {
    const n = tw.currentNode
    nodes.push({ n, s: acc, e: acc + n.nodeValue.length })
    acc += n.nodeValue.length
  }
  if (!nodes.length) return []
  const locate = (pos) => {
    for (const x of nodes) if (pos < x.e) return { n: x.n, o: pos - x.s }
    const l = nodes[nodes.length - 1]
    return { n: l.n, o: l.n.nodeValue.length }
  }
  const locateEnd = (pos) => {
    for (const x of nodes) if (pos <= x.e && pos > x.s) return { n: x.n, o: pos - x.s }
    const l = nodes[nodes.length - 1]
    return { n: l.n, o: l.n.nodeValue.length }
  }

  const frags = []
  tokens.forEach((tok, i) => {
    if (i % 2 === 1 || !tok) return
    const a = locate(starts[i])
    const b = locateEnd(starts[i] + tok.length)
    const r = document.createRange()
    r.setStart(a.n, a.o)
    r.setEnd(b.n, b.o)
    const rects = Array.from(r.getClientRects()).filter((q) => q.width > 0.5)
    rects.forEach((q, k) => frags.push({ i, top: Math.round(q.top), left: q.left, right: q.right, first: k === 0, n: rects.length }))
  })

  const lines = new Map()
  for (const f of frags) {
    if (!lines.has(f.top)) lines.set(f.top, [])
    lines.get(f.top).push(f)
  }
  const tops = [...lines.keys()].sort((a, b) => a - b)
  const out = []
  for (let li = 0; li < tops.length - 1; li++) {
    const L = lines.get(tops[li]).sort((a, b) => a.left - b.left)
    const lastTok = L[L.length - 1].i
    if (tokens[lastTok + 1] && tokens[lastTok + 1].includes('\n')) continue
    let gap = 0
    for (let k = 1; k < L.length; k++) {
      if (L[k].i !== L[k - 1].i) gap = Math.max(gap, (L[k].left - L[k - 1].right) / fs)
    }
    const next = lines.get(tops[li + 1]).sort((a, b) => a.left - b.left)[0]
    out.push({
      key: `${L[0].i}:${L[0].first ? 1 : 0}`,
      gap,
      gaps: Math.max(L.filter((f, k) => k > 0 && f.i !== L[k - 1].i).length, 1),
      nextI: next.i,
      nextFirst: next.first,
      nextTok: tokens[next.i],
      toks: L.filter((f) => f.n === 1).map((f) => ({ i: f.i, chars: tokens[f.i].length })),
      width: L[L.length - 1].right - L[0].left,
      fs,
    })
  }
  return out
}

export default function SoftJustify({ text, as: Tag = 'p', className = '', ...rest }) {
  const narrow = useNarrow()
  const active = narrow && HANGUL.test(text)
  const ref = useRef(null)
  const [plan, setPlan] = useState({ text: '', levels: null, spacing: null })

  useEffect(() => {
    const el = ref.current
    if (!active || !el) return undefined
    let lastW = -1
    const run = (force) => {
      const width = el.clientWidth
      if (!(width > 0)) return
      if (!force && Math.abs(width - lastW) < 0.5) return
      lastW = width
      // 1) 처음 상태(어절을 하나도 쪼개지 않음)로 되돌린 뒤
      let levels = new Map()
      let spacing = new Map()
      flushSync(() => setPlan({ text, levels, spacing }))
      // 2) 위에서부터 벌어진 줄을 하나씩 찾아, 그 다음 줄로 밀려난 어절을 열어 준다
      //    (고칠 때마다 실제로 다시 그려 보고 다음 줄로 — 폰트·기기가 달라도 화면 그대로 기준)
      for (let step = 0; step < MAX_STEPS; step++) {
        const hit = analyze(el, text).find((ln) => {
          if (ln.gap <= GAP_LOOSE || !ln.nextFirst) return false
          const lv = levels.get(ln.nextI) || 0
          return !(lv > 2 || lv >= 2 || (lv >= 1 && ln.gap <= GAP_VERY_LOOSE))
        })
        if (!hit) break
        const have = levels.get(hit.nextI) || 0
        let level = hit.gap > GAP_VERY_LOOSE ? 2 : 1
        if (level <= have) level = have + 1
        while (level <= 2 && breakPoints(hit.nextTok, level).length === 0) {
          level = hit.gap > GAP_VERY_LOOSE ? level + 1 : 3
        }
        levels = new Map(levels)
        levels.set(hit.nextI, level > 2 ? 3 : level) // 3 = 더 열 수 없어 '시도 완료'
        flushSync(() => setPlan({ text, levels, spacing }))
      }
      // 3) 어절을 열어도 안 되는 줄(영어·숫자 등)은 글자 사이를 아주 조금만 벌려 간격 부담을 나눈다
      const tried = new Set()
      for (let step = 0; step < MAX_STEPS; step++) {
        const hit = analyze(el, text).find((ln) => ln.gap > GAP_LOOSE && !tried.has(ln.key) && ln.toks.length > 0)
        if (!hit) break
        tried.add(hit.key)
        const chars = hit.toks.reduce((n, t) => n + t.chars, 0)
        const slackEm = (hit.gap - 0.27) * hit.gaps
        const ls = Math.min(hit.gap > 1.1 ? MAX_LS_WIDE : MAX_LS, (slackEm * 0.8) / chars)
        if (!(ls > 0.004)) continue
        const before = spacing
        spacing = new Map(spacing)
        hit.toks.forEach((t) => spacing.set(t.i, ls))
        flushSync(() => setPlan({ text, levels, spacing }))
        const now = analyze(el, text).find((ln) => ln.key === hit.key)
        // 줄바꿈 위치가 달라졌거나 나아지지 않았으면 되돌린다
        if (!now || now.nextI !== hit.nextI || now.nextFirst !== hit.nextFirst || now.gap >= hit.gap) {
          spacing = before
          flushSync(() => setPlan({ text, levels, spacing }))
        }
      }
    }
    const ro = new ResizeObserver(() => run(false))
    ro.observe(el)
    const fonts = document.fonts
    if (fonts?.ready) fonts.ready.then(() => run(true))
    return () => ro.disconnect()
  }, [active, text])

  const ok = active && plan.text === text
  const levels = ok ? plan.levels : null
  const spacing = ok ? plan.spacing : null
  const cls = `${className}${active ? ' sj' : ''}`.trim()
  return (
    <Tag ref={ref} className={cls || undefined} {...rest}>
      {render(text, levels, spacing)}
    </Tag>
  )
}
