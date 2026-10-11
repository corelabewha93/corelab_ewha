import { useEffect, useRef } from 'react'
import '../styles/hero-ambient.css'
import { scrollToSection } from '../router/scrollToSection'
import { useLang } from '../i18n/LangContext'

/**
 * 인트로가 끝난 뒤에도 "함께 배우는 중"이라는 느낌이 남도록, 소속 문구 아래에
 * 처음 장면의 사람들(빛)을 아주 작고 옅게 남겨 둡니다.
 *
 * - 8.5초마다 한 사람에게서 생각(빛)이 떠올라 이웃에게 차례로 건너가고, 도착한 사람의 링이 차오릅니다.
 *   모두 이어지면 링이 함께 꽉 찼다가, 빛이 아래 화살표로 떨어지며 "아래로 이어집니다"를 알려 줍니다.
 * - 화살표를 누르면 Lab Overview로 내려갑니다.
 * - 동작 줄이기 설정이면 움직이지 않고 옅은 모양만 보여줍니다.
 *
 * 모양(SHAPE): 이화(梨花) 배꽃 — 다섯 사람 = 다섯 꽃잎. 점의 자리(단위 좌표), 이어진 선, 생각이 건너가는 순서를 정합니다.
 */

const NS = 'http://www.w3.org/2000/svg'
const GOLD = '#e4d083'
const MINT = '#8fe3ea'
const IVORY = '#fffbea'
const chalk = (a) => `rgba(245,242,232,${a})`

const ring5 = (k, rad = 1, rot = -90) => {
  const a = ((rot + k * 72) * Math.PI) / 180
  return [Math.cos(a) * rad, Math.sin(a) * rad]
}

// 이화(梨花) = 배꽃. 다섯 사람이 다섯 꽃잎이 되고, 모두 이어지면(오각형 + 별 = 모두가 모두와 연결) 꽃이 핍니다.
const SHAPE = {
  pts: [0, 1, 2, 3, 4].map((k) => ring5(k)),
  center: [0, 0],
  petals: { rx: 0.8, ry: 0.64 }, // 꽃잎: 바깥쪽으로 조금 긴 둥근 잎
  hideAllBase: true, // 별 모양(모두가 모두와) 선은 꽃이 필 때만 잠깐 보입니다
  nodeR: 0.78,
  hop: [0, 1, 2, 3, 4].map((k) => [k, (k + 1) % 5]),
  all: [0, 1, 2, 3, 4].map((k) => [k, (k + 2) % 5]),
  origins: [0, 2, 4, 1, 3], // 릴레이가 시작되는 사람(돌아가며)
  width: { pc: 128, m: 118 },
}

const PERIOD = 8.5 // 한 번의 릴레이 주기(초)
const HOP = 0.75 // 이웃에게 건너가는 시간
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

const shapeOf = () => SHAPE

/** 생각이 출발점에서 각 사람에게 닿기까지 몇 칸인지 (선을 따라) */
function hopDistances(S, origin) {
  const n = S.pts.length
  const d = Array(n).fill(Infinity)
  d[origin] = 0
  const q = [origin]
  while (q.length) {
    const a = q.shift()
    S.hop.forEach(([i, j]) => {
      const b = i === a ? j : j === a ? i : -1
      if (b >= 0 && d[b] === Infinity) {
        d[b] = d[a] + 1
        q.push(b)
      }
    })
  }
  return d
}

/** 한 번의 릴레이(시작 후 u초)에서 사람·선마다 얼마나 켜져 있는지 */
function cycleState(S, u, origin) {
  const dist = hopDistances(S, origin)
  const arr = dist.map((d) => (Number.isFinite(d) ? d * HOP : Infinity))
  const finite = arr.filter(Number.isFinite)
  const allAt = Math.max(...finite) + FILL * 0.6
  const endAt = allAt
  const fadeAt = endAt + 1.9
  const fade = 1 - eo(pr(u, fadeAt, FADE))
  const all = eio(pr(u, allAt, 0.35))
  const nodes = arr.map((a) => {
    const f = eio(pr(u, a, FILL))
    return { ring: SOLO * f + (1 - SOLO) * all, ringO: fade * clamp(f * 10), on: eio(pr(u, a + 0.08, 0.3)) * fade }
  })
  const link = (i, j, start, d, from) => {
    const p = pr(u, start, d)
    return { p: eio(p) * (p > 0 ? 1 : 0), fade, from, moving: p > 0 && p < 1, rev: from === j }
  }
  const links = [
    ...S.hop.map(([i, j]) => {
      if (arr[i] === arr[j]) return link(i, j, allAt - 0.25, 0.4, i) // 같은 때 닿는 두 사람 사이: 마지막에 함께
      const from = arr[i] < arr[j] ? i : j
      return link(i, j, arr[from], HOP, from)
    }),
    ...S.all.map(([i, j], k) => ({ ...link(i, j, allAt - 0.25 + k * 0.06, 0.4, i), moving: false })),
  ]
  const beat = Math.sin(pr(u, allAt + 0.05, 0.42) * Math.PI)
  const drop = pr(u, endAt + 0.55, DROP)
  return { nodes, links, all: all * fade, beat: beat * fade, drop, active: u >= 0 && u < fadeAt + FADE }
}

function build(svg, S) {
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
    ['ha-glow-w', IVORY],
  ].forEach(([id, c]) => {
    const g = mk('radialGradient', { id }, defs)
    mk('stop', { offset: 0, 'stop-color': c, 'stop-opacity': 0.9 }, g)
    mk('stop', { offset: 1, 'stop-color': c, 'stop-opacity': 0 }, g)
  })
  const root = mk('g', { class: 'hero-ambient-band' })
  const petalG = mk('g', {}, root)
  const linkG = mk('g', {}, root)
  const nodeG = mk('g', {}, root)
  const fx = mk('g', {}, root)
  const cue = mk('g', {}, root)

  const path = (parent, attrs) => mk('path', { fill: 'none', 'stroke-linecap': 'round', ...attrs }, parent)
  const pairs = [...S.hop, ...S.all]
  const links = pairs.map((_, k) => {
    const isAll = k >= S.hop.length
    const base = path(linkG, { stroke: chalk(isAll && S.hideAllBase ? 0 : 0.16) })
    const tint = path(linkG, { pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, opacity: 0 })
    const pulse = mk('circle', { r: 2.4, fill: '#fff', opacity: 0 }, fx)
    return { base, tint, pulse }
  })
  // 꽃잎: (1) 다섯 잎을 합친 실루엣(겹친 자리가 진해지지 않게 한 묶음으로) + 바깥 테두리만
  //       (2) 생각이 닿은 사람의 잎만 따로 밝아지는 층
  let petals = []
  let petalShape = null
  if (S.petals) {
    const mask = mk('mask', { id: 'ha-petal-out', maskUnits: 'userSpaceOnUse' }, defs)
    mk('rect', { x: -9999, y: -9999, width: 30000, height: 30000, fill: '#fff' }, mask)
    const maskCut = S.pts.map(() => mk('ellipse', { fill: '#000' }, mask))
    const outline = mk('g', { mask: 'url(#ha-petal-out)' }, petalG)
    const outlines = S.pts.map(() => mk('ellipse', { fill: 'none', stroke: chalk(0.3), 'stroke-width': 2 }, outline))
    const silhouette = mk('g', { opacity: 0.05 }, petalG)
    const fills = S.pts.map(() => mk('ellipse', { fill: IVORY }, silhouette))
    petals = S.pts.map(() => mk('ellipse', { fill: IVORY, 'fill-opacity': 0 }, petalG))
    petalShape = { all: [...maskCut, ...outlines, ...fills, ...petals], outline, silhouette }
  }
  const center = S.center
    ? {
        glow: mk('circle', { fill: 'url(#ha-glow-a)', opacity: 0 }, petalG),
        dots: [0, 1, 2, 3, 4].map(() => mk('circle', { fill: GOLD, opacity: 0.3 }, petalG)),
      }
    : null
  const nodes = S.pts.map((_, i) => {
    const color = i % 2 ? MINT : GOLD
    const g = mk('g', {}, nodeG)
    const glow = mk('circle', { fill: `url(#ha-glow-${i % 2 ? 'b' : 'a'})`, opacity: 0 }, g)
    const track = mk('circle', { fill: 'none', stroke: chalk(0.13) }, g)
    const ring = mk('circle', { fill: 'none', stroke: color, 'stroke-linecap': 'round', pathLength: 1, opacity: 0 }, g)
    const head = mk('circle', { fill: color, 'fill-opacity': 0.16, stroke: chalk(0.36) }, g)
    const ping = mk('circle', { fill: 'none', stroke: color, opacity: 0 }, g)
    return { g, glow, track, ring, head, ping, color }
  })
  // 스크롤 신호: 아래 짧은 선 + 작은 화살표
  const cueLine = path(cue, { stroke: chalk(0.22) })
  const cueArrow = path(cue, { stroke: chalk(0.42), 'stroke-linejoin': 'round' })
  const cueDot = mk('circle', { fill: IVORY, opacity: 0 }, cue)
  const cueGlow = mk('circle', { fill: 'url(#ha-glow-w)', opacity: 0 }, cue)
  return { S, root, pairs, links, petals, petalShape, center, nodes, cueLine, cueArrow, cueDot, cueGlow }
}

/**
 * 모양을 화면 크기에 맞춰 놓습니다 (px). q = 0~1: 화면 높이가 낮을수록 간격·화살표를 줄입니다.
 * 반환값 need: 소속 문구 아래로 필요한 높이.
 */
function layoutShape(S, W, q) {
  const mobile = W < 560
  const bw = Math.min(mobile ? W - 72 : W * 0.5, mobile ? S.width.m : S.width.pc)
  const xs = S.pts.map((p) => p[0])
  const ys = S.pts.map((p) => p[1])
  const pad = S.petals.rx
  let minX = Math.min(...xs) - pad
  let maxX = Math.max(...xs) + pad
  let minY = Math.min(...ys) - pad
  let maxY = Math.max(...ys) + pad
  const k = (bw / (maxX - minX)) * (0.6 + 0.4 * q)
  const r = (mobile ? 5 : 6) * S.nodeR * (0.78 + 0.22 * q)
  const gap = 12 + ((mobile ? 30 : 34) - 12) * q
  const cueLen = 12 + ((mobile ? 20 : 24) - 12) * q
  const h = (maxY - minY) * k
  const top = gap
  const pts = S.pts.map(([x, y]) => [W / 2 + (x - (minX + maxX) / 2) * k, top + (y - minY) * k])
  const center = S.center ? [W / 2 + (S.center[0] - (minX + maxX) / 2) * k, top + (S.center[1] - minY) * k] : null
  const bottom = top + h
  const cueTop = bottom + 4
  return { pts, center, r, k, cueTop, cueLen, need: cueTop + cueLen + 14, mobile }
}

/**
 * 화면 높이가 낮은 노트북·휴대폰에서도 작은 그림과 화살표가 첫 화면 안에 보이도록,
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
  const full = layoutShape(shapeOf(), sr.width, 1).need
  // 첫 화면의 아래 끝 또는 칠판(hero)의 아래 끝 중 더 위쪽까지
  const limit = Math.min(window.innerHeight, sr.bottom + window.scrollY)
  const avail = limit - (aff.getBoundingClientRect().bottom + window.scrollY)
  const deficit = full - avail
  if (deficit <= 0) return
  // 칠판 위쪽 여백 안으로는 올라가지 않습니다 (그 이상 올리면 칠판만 길어지므로).
  const padTop = parseFloat(getComputedStyle(section).paddingTop) || 0
  const maxUp = content.getBoundingClientRect().top - sr.top - padTop
  const room = Math.max(0, Math.min(deficit * 2, maxUp * 2, 220))
  section.style.setProperty('--ambient-room', `${Math.round(room)}px`)
}

/** 소속 문구 바로 아래에 그림의 자리·크기를 정합니다 (px). */
function geometry(section, S) {
  const sr = section.getBoundingClientRect()
  const anchor = section.querySelector('.hero-affiliation') || section.querySelector('.hero-intro-content')
  const ar = anchor ? anchor.getBoundingClientRect() : { bottom: sr.top + sr.height * 0.8 }
  const W = sr.width
  // 노트북처럼 화면 높이가 낮으면, 첫 화면 안에 들어오도록 간격·크기·화살표 길이를 조금씩 줄입니다.
  const full = layoutShape(S, W, 1).need
  const min = layoutShape(S, W, 0).need
  const limit = Math.min(window.innerHeight, sr.bottom + window.scrollY)
  const avail = limit - (ar.bottom + window.scrollY)
  const q = clamp((avail - min) / (full - min || 1))
  const L = layoutShape(S, W, q)
  const off = ar.bottom - sr.top
  const sh = ([x, y]) => [x, y + off]
  return {
    W,
    H: sr.height,
    pts: L.pts.map(sh),
    center: L.center ? sh(L.center) : null,
    k: L.k,
    r: L.r,
    cueX: W / 2,
    cueTop: L.cueTop + off,
    cueLen: L.cueLen,
    mobile: L.mobile,
  }
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
  const S = s.S
  s.geo = G
  const mid = G.center ?? [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  s.links.forEach((l, k) => {
    const [i, j] = s.pairs[k]
    const A = trim(pts[i], pts[j], r * 1.9)
    const B = trim(pts[j], pts[i], r * 1.9)
    const dx = B[0] - A[0]
    const dy = B[1] - A[1]
    const len = Math.hypot(dx, dy) || 1
    let C = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]
    const isHop = k < S.hop.length
    if (isHop) {
      // 꽃 바깥쪽으로 살짝 부푼 곡선
      const ox = C[0] - mid[0]
      const oy = C[1] - mid[1]
      const ol = Math.hypot(ox, oy) || 1
      C = [C[0] + (ox / ol) * len * 0.14, C[1] + (oy / ol) * len * 0.14]
    }
    const d = `M${A[0].toFixed(1)},${A[1].toFixed(1)} Q${C[0].toFixed(1)},${C[1].toFixed(1)} ${B[0].toFixed(1)},${B[1].toFixed(1)}`
    l.base.setAttribute('d', d)
    l.tint.setAttribute('d', d)
    const thin = !isHop
    l.base.setAttribute('stroke-width', thin ? 0.9 : 1.3)
    l.tint.setAttribute('stroke-width', thin ? 1.1 : 1.6)
    Object.assign(l, { A, B, C })
  })
  if (s.petalShape) {
    const n = S.pts.length
    s.petalShape.all.forEach((e, idx) => {
      const i = idx % n
      const [x, y] = pts[i]
      const ang = (Math.atan2(y - mid[1], x - mid[0]) * 180) / Math.PI
      e.setAttribute('cx', x)
      e.setAttribute('cy', y)
      e.setAttribute('rx', (S.petals.rx * G.k).toFixed(2))
      e.setAttribute('ry', (S.petals.ry * G.k).toFixed(2))
      e.setAttribute('transform', `rotate(${ang.toFixed(1)} ${x} ${y})`)
    })
  }
  if (s.center) {
    const [cx, cy] = G.center
    s.center.glow.setAttribute('cx', cx)
    s.center.glow.setAttribute('cy', cy)
    s.center.glow.setAttribute('r', G.k * 0.9)
    s.center.dots.forEach((e, i) => {
      const [x, y] = ring5(i, G.k * 0.17, -54)
      e.setAttribute('cx', (cx + x).toFixed(2))
      e.setAttribute('cy', (cy + y).toFixed(2))
      e.setAttribute('r', (G.k * 0.06 + 0.6).toFixed(2))
    })
  }
  s.nodes.forEach((n, i) => {
    const [x, y] = pts[i]
    const rr = r
    n.x = x
    n.y = y
    n.rr = rr * 1.6
    ;[n.glow, n.track, n.ring, n.head, n.ping].forEach((e) => {
      e.setAttribute('cx', x)
      e.setAttribute('cy', y)
    })
    n.glow.setAttribute('r', rr * 3.6)
    n.head.setAttribute('r', rr)
    n.head.setAttribute('stroke-width', 1.2)
    n.track.setAttribute('r', n.rr)
    n.ring.setAttribute('r', n.rr)
    n.ping.setAttribute('r', n.rr)
    n.track.setAttribute('stroke-width', 1.6)
    n.ring.setAttribute('stroke-width', 1.9)
    n.ring.setAttribute('transform', `rotate(-90 ${x} ${y})`)
  })
  const cx = G.cueX
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
    const S = shapeOf()
    const s = build(svg, S)
    const t0 = performance.now()
    const now = () => (performance.now() - t0) / 1000
    const showAt = animated ? SHOW_AT : 0.2
    const still = REDUCED
    let raf = 0
    let frame = 0
    let visible = true

    const relayout = () => {
      const G = geometry(section, S)
      svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`)
      place(s, G)
      const b = btnRef.current
      if (b) {
        const top = Math.max(...G.pts.map((p) => p[1])) - G.r * 2
        b.style.left = `${G.cueX - 22}px`
        b.style.top = `${top}px`
        b.style.height = `${G.cueTop + G.cueLen + 10 - top}px`
      }
    }
    relayout()

    // 릴레이 순서: 지금 것(cur)과 직전 것(prev, 사라지는 중)을 함께 그립니다.
    let cur = { start: showAt + FIRST, origin: S.origins[0], n: 0 }
    let prev = null

    const render = (t) => {
      const show = eo(pr(t, showAt, 1.4))
      svg.style.opacity = show.toFixed(3)
      if (btnRef.current) btnRef.current.style.visibility = show > 0.3 ? 'visible' : 'hidden'
      if (!still && t >= cur.start + PERIOD) {
        prev = cur
        const n = cur.n + 1
        cur = { start: Math.max(cur.start + PERIOD, t - 0.5), origin: S.origins[n % S.origins.length], n }
      }
      const states = still ? [] : [cur, prev].filter(Boolean).map((c) => cycleState(S, t - c.start, c.origin)).filter((c) => c.active)
      const mx = (fn) => Math.max(0, ...states.map(fn))
      const allLit = mx((c) => c.all)
      const beat = mx((c) => c.beat)

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
        n.ring.style.strokeDasharray = `${ring.toFixed(4)} 1`
        n.ring.setAttribute('opacity', (0.95 * ringO).toFixed(3))
        n.head.setAttribute('fill-opacity', (0.16 + 0.62 * on).toFixed(3))
        n.glow.setAttribute('opacity', (on * 0.55 + beat * 0.3).toFixed(3))
        n.ping.setAttribute('opacity', (beat * 0.45).toFixed(3))
        n.ping.setAttribute('r', (n.rr * (1 + 0.6 * (1 - beat))).toFixed(2))
        if (s.petals[i]) s.petals[i].setAttribute('fill-opacity', (0.09 * on).toFixed(3))
      })
      if (s.petalShape) {
        s.petalShape.silhouette.setAttribute('opacity', (0.05 + 0.07 * allLit).toFixed(3))
        s.petalShape.outline.setAttribute('opacity', (0.75 + 0.25 * allLit).toFixed(3))
      }
      if (s.center) {
        s.center.glow.setAttribute('opacity', (allLit * 0.7 + beat * 0.25).toFixed(3))
        s.center.dots.forEach((e) => e.setAttribute('opacity', (0.3 + 0.65 * allLit).toFixed(3)))
      }

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
        const src = G.center
        const x0 = src[0]
        const y0 = src[1]
        const x = x0 + (G.cueX - x0) * d
        const y = y0 + (G.cueTop + G.cueLen + 2 - y0) * d
        ;[s.cueDot, s.cueGlow].forEach((e) => {
          e.setAttribute('cx', x.toFixed(1))
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
