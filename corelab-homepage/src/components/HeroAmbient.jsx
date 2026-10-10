import { useEffect, useRef } from 'react'
import '../styles/hero-ambient.css'
import { scrollToSection } from '../router/scrollToSection'
import { useLang } from '../i18n/LangContext'

/**
 * 인트로가 끝난 뒤에도 "함께 배우는 중"이라는 느낌이 남도록, 소속 문구 아래에
 * 처음 장면의 다섯 사람 네트워크를 아주 작고 옅게 남겨 둡니다.
 *
 * - 8.5초마다 한 사람에게서 생각(빛)이 떠올라 옆 사람에게 차례로 건너가고, 도착한 사람의 링이 차오릅니다.
 *   모두 이어지면 링이 함께 꽉 찼다가, 가운데 사람에게서 빛이 아래로 떨어지며 "아래로 이어집니다"를 알려 줍니다.
 * - 가운데 아래 짧은 선 + 화살표(스크롤 신호)를 누르면 Lab Overview로 내려갑니다.
 * - 동작 줄이기 설정이면 움직이지 않고 옅은 네트워크만 보여줍니다.
 */

const NS = 'http://www.w3.org/2000/svg'
const GOLD = '#e4d083'
const MINT = '#8fe3ea'
const chalk = (a) => `rgba(245,242,232,${a})`

// 처음 장면(넓은 화면 배치)의 다섯 사람 높이 모양을 그대로 줄여 씁니다.
const SHAPE_Y = [50, 0, 67, 0, 50]
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 2],
  [1, 3],
  [2, 4],
]
const ORIGINS = [2, 0, 4, 1, 3]

const PERIOD = 8.5 // 한 번의 릴레이 주기(초)
const HOP = 0.75 // 옆 사람에게 건너가는 시간
const FILL = 0.55 // 도착 후 링이 차오르는 시간
const SOLO = 0.7
const FADE = 1.8
const DROP = 1.1 // 아래로 떨어지는 빛
const SHOW_AT = 10.2 // 인트로를 처음부터 볼 때, 소속 문구가 나타난 뒤 등장하는 시각
const FIRST = 1.6 // 등장 후 첫 릴레이까지

const clamp = (x) => Math.max(0, Math.min(1, x))
const pr = (t, s, d) => clamp((t - s) / d)
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eo = (x) => 1 - Math.pow(1 - x, 3)

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 한 번의 릴레이(시작 후 u초)에서 사람·선마다 얼마나 켜져 있는지 */
function cycleState(u, origin) {
  const arr = [0, 1, 2, 3, 4].map((i) => Math.abs(i - origin) * HOP)
  const allAt = Math.max(...arr) + FILL * 0.6
  const fadeAt = allAt + 1.9
  const fade = 1 - eo(pr(u, fadeAt, FADE))
  const all = eio(pr(u, allAt, 0.35))
  const nodes = arr.map((a) => {
    const f = eio(pr(u, a, FILL))
    return { ring: SOLO * f + (1 - SOLO) * all, ringO: fade * clamp(f * 10), on: eio(pr(u, a + 0.08, 0.3)) * fade }
  })
  const links = LINKS.map(([i, j], k) => {
    if (k < 4) {
      const from = arr[i] < arr[j] ? i : j
      const p = pr(u, arr[from], HOP)
      return { p: eio(p) * (p > 0 ? 1 : 0), fade, from, moving: p > 0 && p < 1, rev: from === j }
    }
    const p = pr(u, allAt - 0.25 + (k - 4) * 0.06, 0.4)
    return { p: eio(p), fade, from: i, moving: false, rev: false }
  })
  const beat = Math.sin(pr(u, allAt + 0.05, 0.42) * Math.PI)
  const drop = pr(u, allAt + 0.55, DROP)
  return { nodes, links, beat: beat * fade, drop, active: u >= 0 && u < fadeAt + FADE }
}

function build(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  const mk = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag)
    for (const k in attrs) e.setAttribute(k, attrs[k])
    parent.appendChild(e)
    return e
  }
  const defs = mk('defs', {})
  ;[
    ['ha-glow-a', GOLD],
    ['ha-glow-b', MINT],
    ['ha-glow-w', '#fffbea'],
  ].forEach(([id, c]) => {
    const g = mk('radialGradient', { id }, defs)
    mk('stop', { offset: 0, 'stop-color': c, 'stop-opacity': 0.9 }, g)
    mk('stop', { offset: 1, 'stop-color': c, 'stop-opacity': 0 }, g)
  })
  const root = mk('g', { class: 'hero-ambient-band' })
  const linkG = mk('g', {}, root)
  const nodeG = mk('g', {}, root)
  const fx = mk('g', {}, root)
  const cue = mk('g', {}, root)

  const path = (parent, attrs) => mk('path', { fill: 'none', 'stroke-linecap': 'round', ...attrs }, parent)
  const links = LINKS.map(() => {
    const base = path(linkG, { stroke: chalk(0.16) })
    const tint = path(linkG, { pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, opacity: 0 })
    const pulse = mk('circle', { r: 2.4, fill: '#fff', opacity: 0 }, fx)
    return { base, tint, pulse }
  })
  const nodes = [0, 1, 2, 3, 4].map((i) => {
    const color = i % 2 ? MINT : GOLD
    const g = mk('g', {}, nodeG)
    const glow = mk('circle', { fill: `url(#ha-glow-${i % 2 ? 'b' : 'a'})`, opacity: 0 }, g)
    const track = mk('circle', { fill: 'none', stroke: chalk(0.13) }, g)
    const ring = mk('circle', { fill: 'none', stroke: color, 'stroke-linecap': 'round', pathLength: 1, opacity: 0 }, g)
    const head = mk('circle', { fill: color, 'fill-opacity': 0.16, stroke: chalk(0.36) }, g)
    const ping = mk('circle', { fill: 'none', stroke: color, opacity: 0 }, g)
    return { g, glow, track, ring, head, ping, color }
  })
  // 스크롤 신호: 가운데 사람 아래 짧은 선 + 작은 화살표
  const cueLine = path(cue, { stroke: chalk(0.22) })
  const cueArrow = path(cue, { stroke: chalk(0.42), 'stroke-linejoin': 'round' })
  const cueDot = mk('circle', { fill: '#fffbea', opacity: 0 }, cue)
  const cueGlow = mk('circle', { fill: 'url(#ha-glow-w)', opacity: 0 }, cue)
  return { root, links, nodes, cueLine, cueArrow, cueDot, cueGlow }
}

/**
 * 화면 높이가 낮은 노트북·휴대폰에서도 작은 네트워크와 화살표가 첫 화면 안에 보이도록,
 * 이름·문구 묶음을 위로 올릴 만큼의 여유(px)를 계산해 .hero-intro의 --ambient-room에 넣습니다.
 * (넉넉한 화면에서는 0이라 지금과 똑같습니다. HeroIntro.jsx가 "CoRe Lab"으로 모이는 순간에 한 번 부릅니다)
 */
export function fitAmbientRoom(section) {
  if (!section) return
  section.style.setProperty('--ambient-room', '0px')
  const aff = section.querySelector('.hero-affiliation')
  const content = section.querySelector('.hero-intro-content')
  if (!aff || !content) return
  const sr = section.getBoundingClientRect()
  const W = sr.width
  const mobile = W < 560
  const bw = mobile ? Math.min(W - 72, 300) : Math.min(W * 0.5, 560)
  const r = mobile ? 5 : 6
  const full = (mobile ? 30 : 34) + r * 1.6 + bw * (mobile ? 0.085 : 0.072) + r * 1.7 + 4 + (mobile ? 20 : 24) + 14
  const avail = window.innerHeight - (aff.getBoundingClientRect().bottom + window.scrollY)
  const deficit = full - avail
  if (deficit <= 0) return
  // 칠판 위쪽 여백 안으로는 올라가지 않습니다 (그 이상 올리면 칠판만 길어지므로).
  const padTop = parseFloat(getComputedStyle(section).paddingTop) || 0
  const maxUp = content.getBoundingClientRect().top - sr.top - padTop
  const room = Math.max(0, Math.min(deficit * 2, maxUp * 2, 220))
  section.style.setProperty('--ambient-room', `${Math.round(room)}px`)
}

/** 소속 문구 바로 아래에 띠의 자리·크기를 정합니다 (px). */
function geometry(section) {
  const sr = section.getBoundingClientRect()
  const anchor = section.querySelector('.hero-affiliation') || section.querySelector('.hero-intro-content')
  const ar = anchor ? anchor.getBoundingClientRect() : { bottom: sr.top + sr.height * 0.8 }
  const W = sr.width
  const mobile = W < 560
  const bw = mobile ? Math.min(W - 72, 300) : Math.min(W * 0.5, 560)
  const r = mobile ? 5 : 6
  const sh0 = bw * (mobile ? 0.085 : 0.072) // 띠의 높낮이
  const gap0 = mobile ? 30 : 34
  const cue0 = mobile ? 20 : 24
  // 노트북처럼 화면 높이가 낮으면, 첫 화면 안에 들어오도록 간격·높낮이·화살표 길이를 조금씩 줄입니다.
  const need = (g, h, c) => g + r * 1.6 + h + r * 1.7 + 4 + c + 10
  const full = need(gap0, sh0, cue0)
  const min = need(16, sh0 * 0.7, 12)
  const avail = window.innerHeight - (ar.bottom + window.scrollY)
  const q = clamp((avail - min) / (full - min))
  const sh = sh0 * (0.7 + 0.3 * q)
  const top = ar.bottom - sr.top + 16 + (gap0 - 16) * q + r * 1.6
  const x0 = W / 2 - bw / 2
  const pts = SHAPE_Y.map((y, i) => [x0 + (bw * i) / 4, top + (y / 67) * sh])
  const cueTop = pts[2][1] + r * 1.7 + 4
  const cueLen = 12 + (cue0 - 12) * q
  return { W, H: sr.height, pts, r, cueTop, cueLen, mobile }
}

function quad(A, B, k) {
  const dx = B[0] - A[0]
  const dy = B[1] - A[1]
  const l = Math.hypot(dx, dy) || 1
  const bend = (k % 2 ? 1 : -1) * l * 0.16
  return [(A[0] + B[0]) / 2 - (dy / l) * bend, (A[1] + B[1]) / 2 + (dx / l) * bend]
}
const trim = (a, b, r) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  return [a[0] + (dx / l) * r, a[1] + (dy / l) * r]
}
const onQuad = (A, C, B, w) => {
  const a = (1 - w) * (1 - w)
  const b = 2 * (1 - w) * w
  const c = w * w
  return [a * A[0] + b * C[0] + c * B[0], a * A[1] + b * C[1] + c * B[1]]
}

function place(s, G) {
  const { pts, r } = G
  s.geo = G
  s.links.forEach((l, k) => {
    const [i, j] = LINKS[k]
    const A = trim(pts[i], pts[j], r * 1.9)
    const B = trim(pts[j], pts[i], r * 1.9)
    const C = quad(A, B, k)
    const d = `M${A[0].toFixed(1)},${A[1].toFixed(1)} Q${C[0].toFixed(1)},${C[1].toFixed(1)} ${B[0].toFixed(1)},${B[1].toFixed(1)}`
    l.base.setAttribute('d', d)
    l.tint.setAttribute('d', d)
    l.base.setAttribute('stroke-width', k < 4 ? 1.3 : 1)
    l.tint.setAttribute('stroke-width', k < 4 ? 1.6 : 1.2)
    Object.assign(l, { A, B, C })
  })
  s.nodes.forEach((n, i) => {
    const [x, y] = pts[i]
    n.x = x
    n.y = y
    n.rr = r * 1.6
    ;[n.glow, n.track, n.ring, n.head, n.ping].forEach((e) => {
      e.setAttribute('cx', x)
      e.setAttribute('cy', y)
    })
    n.glow.setAttribute('r', r * 3.6)
    n.head.setAttribute('r', r)
    n.head.setAttribute('stroke-width', 1.2)
    n.track.setAttribute('r', n.rr)
    n.ring.setAttribute('r', n.rr)
    n.ping.setAttribute('r', n.rr)
    n.track.setAttribute('stroke-width', 1.6)
    n.ring.setAttribute('stroke-width', 1.9)
    n.ring.setAttribute('transform', `rotate(-90 ${x} ${y})`)
  })
  const cx = pts[2][0]
  s.cueLine.setAttribute('d', `M${cx},${G.cueTop} L${cx},${G.cueTop + G.cueLen}`)
  s.cueLine.setAttribute('stroke-width', 1.2)
  const ay = G.cueTop + G.cueLen + 3
  s.cueArrow.setAttribute('d', `M${cx - 4.5},${ay - 3} L${cx},${ay + 1.5} L${cx + 4.5},${ay - 3}`)
  s.cueArrow.setAttribute('stroke-width', 1.3)
  s.cueDot.setAttribute('r', 2.2)
  s.cueGlow.setAttribute('r', 11)
}

export default function HeroAmbient({ animated }) {
  const svgRef = useRef(null)
  const btnRef = useRef(null)
  const { tr } = useLang()

  useEffect(() => {
    const svg = svgRef.current
    const section = svg?.closest('.hero-intro')
    if (!svg || !section) return undefined
    const s = build(svg)
    const t0 = performance.now()
    const now = () => (performance.now() - t0) / 1000
    const showAt = animated ? SHOW_AT : 0.2
    const still = REDUCED
    let raf = 0
    let frame = 0
    let visible = true

    const relayout = () => {
      const G = geometry(section)
      svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`)
      place(s, G)
      const b = btnRef.current
      if (b) {
        b.style.left = `${G.pts[2][0] - 22}px`
        b.style.top = `${G.pts[2][1] - G.r * 2}px`
        b.style.height = `${G.cueTop + G.cueLen + 10 - (G.pts[2][1] - G.r * 2)}px`
      }
    }
    relayout()

    // 릴레이 순서: 지금 것(cur)과 직전 것(prev, 사라지는 중)을 함께 그립니다.
    let cur = { start: showAt + FIRST, origin: ORIGINS[0], n: 0 }
    let prev = null

    const render = (t) => {
      const show = eo(pr(t, showAt, 1.4))
      svg.style.opacity = show.toFixed(3)
      if (btnRef.current) btnRef.current.style.visibility = show > 0.3 ? 'visible' : 'hidden'
      if (!still && t >= cur.start + PERIOD) {
        prev = cur
        const n = cur.n + 1
        cur = { start: Math.max(cur.start + PERIOD, t - 0.5), origin: ORIGINS[n % ORIGINS.length], n }
      }
      const states = still ? [] : [cur, prev].filter(Boolean).map((c) => cycleState(t - c.start, c.origin)).filter((c) => c.active)
      const mx = (fn) => Math.max(0, ...states.map(fn))

      s.nodes.forEach((n, i) => {
        // 링: 가장 또렷한 릴레이의 값 (사라질 때는 길이를 줄이지 않고 흐려지기만)
        let ring = 0
        let ringO = 0
        states.forEach((c) => {
          if (c.nodes[i].ringO > ringO) {
            ringO = c.nodes[i].ringO
            ring = c.nodes[i].ring
          }
        })
        const on = mx((c) => c.nodes[i].on)
        const beat = mx((c) => c.beat)
        n.ring.style.strokeDasharray = `${ring.toFixed(4)} 1`
        n.ring.setAttribute('opacity', (0.95 * ringO).toFixed(3))
        n.head.setAttribute('fill-opacity', (0.16 + 0.62 * on).toFixed(3))
        n.glow.setAttribute('opacity', (on * 0.55 + beat * 0.3).toFixed(3))
        n.ping.setAttribute('opacity', (beat * 0.45).toFixed(3))
        n.ping.setAttribute('r', (n.rr * (1 + 0.6 * (1 - beat))).toFixed(2))
      })

      s.links.forEach((l, k) => {
        let best = null
        states.forEach((c) => {
          const q = c.links[k]
          if (!best || q.p * q.fade > best.p * best.fade) best = q
        })
        if (best && best.p > 0.001) {
          l.tint.setAttribute('stroke', best.from % 2 ? MINT : GOLD)
          l.tint.style.strokeDashoffset = best.rev ? -(1 - best.p) : 1 - best.p
          l.tint.setAttribute('opacity', (0.75 * best.fade).toFixed(3))
        } else l.tint.setAttribute('opacity', 0)
        const mv = states.find((c) => c.links[k].moving)
        if (mv) {
          const q = mv.links[k]
          const w = q.rev ? 1 - q.p : q.p
          const [px, py] = onQuad(l.A, l.C, l.B, w)
          l.pulse.setAttribute('cx', px.toFixed(1))
          l.pulse.setAttribute('cy', py.toFixed(1))
          l.pulse.setAttribute('opacity', 0.95)
        } else l.pulse.setAttribute('opacity', 0)
      })

      // 아래로 떨어지는 빛(스크롤 신호)
      const G = s.geo
      const dr = states.find((c) => c.drop > 0 && c.drop < 1)
      if (dr) {
        const d = eio(dr.drop)
        const y0 = G.pts[2][1] + G.r
        const y = y0 + (G.cueTop + G.cueLen + 2 - y0) * d
        ;[s.cueDot, s.cueGlow].forEach((e) => {
          e.setAttribute('cx', G.pts[2][0])
          e.setAttribute('cy', y.toFixed(1))
        })
        const o = Math.sin(dr.drop * Math.PI)
        s.cueDot.setAttribute('opacity', (0.95 * Math.min(1, o * 2)).toFixed(3))
        s.cueGlow.setAttribute('opacity', (0.6 * o).toFixed(3))
      } else {
        s.cueDot.setAttribute('opacity', 0)
        s.cueGlow.setAttribute('opacity', 0)
      }
      const arrowLit = mx((c) => Math.sin(pr(c.drop, 0.55, 0.45) * Math.PI))
      s.cueArrow.setAttribute('stroke', chalk((0.42 + 0.5 * arrowLit).toFixed(3)))
    }

    const tick = () => {
      if ((frame++ & 31) === 0) relayout() // 글꼴·문구가 늦게 자리 잡아도 따라가도록 가끔 다시 잽니다
      render(now())
      if (visible && !still) raf = requestAnimationFrame(tick)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      if (still) {
        relayout()
        render(Math.max(now(), showAt + 2))
        return
      }
      raf = requestAnimationFrame(tick)
    }

    // 화면 밖으로 스크롤했거나 다른 탭을 보고 있으면 멈춥니다(배터리 절약).
    let io = null
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible) start()
        else cancelAnimationFrame(raf)
      })
      io.observe(section)
    }
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else if (visible) start()
    }
    document.addEventListener('visibilitychange', onVis)
    const onResize = () => (still ? start() : relayout())
    window.addEventListener('resize', onResize)
    let stillTimer = 0
    if (still) stillTimer = setTimeout(start, 400)
    else start()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(stillTimer)
      if (io) io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', onResize)
    }
  }, [animated])

  return (
    <>
      <svg ref={svgRef} className="hero-ambient" aria-hidden="true" focusable="false" style={{ opacity: 0 }} />
      <button
        ref={btnRef}
        type="button"
        className="hero-scroll-cue"
        style={{ visibility: 'hidden' }}
        aria-label={tr('Lab Overview로 내려가기', 'Scroll to Lab Overview')}
        title={tr('Lab Overview로 내려가기', 'Scroll to Lab Overview')}
        onClick={() => scrollToSection('overview')}
      />
    </>
  )
}
