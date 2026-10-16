import { useEffect, useRef } from 'react'
import '../styles/hero-trace.css'

/**
 * 메인 인트로 — "흩어진 학습자 → 모둠의 신호 → CoRe Lab" (약 4.2초, 글자 없이 점으로만)
 *
 *  0–1.1s    짙은 녹색 위에 은은한 점(학습자)들이 떠다님
 *  0.9–1.9s  점들이 네 개의 모둠으로 모임
 *  1.15–1.85s 점으로 만든 카드가 열림 — 모둠 네 줄의 대화 흐름이 점으로 흘러감(왼쪽으로 스크롤)
 *  1.9–2.65s 한 모둠의 흐름이 거세지며 금색으로 점등 → 그 줄이 맨 위로 올라오고,
 *            같은 모둠의 점들도 금빛으로 바뀌며 고리가 퍼짐 (다른 모둠은 옅어짐)
 *  2.55–3.4s 모든 점이 흘러가 "CoRe Lab" 글자 모양(CoRe 금색 · Lab 흰색)으로 모이고,
 *            금색 줄의 점들은 이름 아래 가로선 자리로 모임
 *  3.55–4.1s 점 글자는 사라지고, 그 자리에 선명한 글자(HeroIntro의 실제 이름)가 나타남
 *  이후      부제 · 모토 · 소속은 CSS(hero-trace.css)가 띄움
 * 카드 안에는 글자를 쓰지 않습니다. 모든 움직임의 속도 곡선은 하나: cubic-bezier(0.22, 1, 0.36, 1)
 * 글자 자리와 크기는 화면에 실제로 그려진 이름(.hero-wm)을 재서 정하므로, 화면 크기·글꼴이 바뀌어도 맞습니다.
 */

const END = 4.15
// 바깥(HeroIntro)에서 쓰는 시각(초): 이름 아래 가로선이 나타나는 때
export const TRACE_RULE = 3.56
export const TRACE_LAND = 3.3

const IVORY = [245, 242, 232]
const MINT = [143, 227, 234]
const GOLD = [232, 201, 122]

function bez(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
      const d = dx(t)
      if (Math.abs(d) < 1e-6) break
      t -= (sx(t) - x) / d
    }
    return sy(Math.max(0, Math.min(1, t)))
  }
}
const ease = bez(0.22, 1, 0.36, 1)
const clamp = (x) => Math.max(0, Math.min(1, x))
const pr = (t, s, d) => clamp((t - s) / d)
const lerp = (a, b, u) => a + (b - a) * u
const mix = (c1, c2, u) => [lerp(c1[0], c2[0], u), lerp(c1[1], c2[1], u), lerp(c1[2], c2[2], u)]
const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
function rng(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// ── 시간표(초) ──
const DUST_IN = 0.0
const GATHER = 0.9
const CARD_IN = 1.15
const HOT = 1.9
const LIFT = 2.2
const FLOW = 2.55
const FLOW_DUR = 0.75
const FADE_OUT = 3.55

const GROUPS = 4
const PER_GROUP = 11
const LEARNERS = 62 // 모둠에 들어가는 44 + 떠도는 18
const ROWS = 4
const COLS = 24
const HOT_GROUP = 1

function layout(s) {
  const { W, H } = s
  const wide = W / H >= 0.85
  s.wide = wide
  const m = Math.min(W, H)
  if (wide) {
    const w = Math.min(W * 0.26, 300)
    const h = Math.min(H * 0.4, 290)
    s.card = { x: W * 0.7 - w / 2, y: H * 0.47 - h / 2, w, h }
    const gx = [W * 0.2, W * 0.36, W * 0.2, W * 0.36]
    const gy = [H * 0.3, H * 0.4, H * 0.62, H * 0.7]
    s.centers = gx.map((x, i) => [x, gy[i]])
    s.gr = m * 0.065
  } else {
    const w = Math.min(W * 0.8, 340)
    const h = Math.min(H * 0.22, 150)
    s.card = { x: W / 2 - w / 2, y: H * 0.7 - h / 2, w, h }
    const gx = [W * 0.28, W * 0.66, W * 0.3, W * 0.7]
    const gy = [H * 0.16, H * 0.22, H * 0.38, H * 0.44]
    s.centers = gx.map((x, i) => [x, gy[i]])
    s.gr = m * 0.075
  }
}

function build(s) {
  const r = rng(11)
  s.learners = Array.from({ length: LEARNERS }, (_, i) => {
    const g = i < GROUPS * PER_GROUP ? i % GROUPS : -1
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * s.gr
    return {
      hx: 24 + r() * (s.W - 48),
      hy: 24 + r() * (s.H - 48),
      g,
      gx: g >= 0 ? s.centers[g][0] + Math.cos(a) * d : 0,
      gy: g >= 0 ? s.centers[g][1] + Math.sin(a) * d : 0,
      ph: r() * 6.28,
      r: 1.5 + r() * 1.7,
      tone: r() > 0.55 ? MINT : IVORY,
      delay: r() * 0.7,
    }
  })
  const rr = rng(23)
  s.seq = Array.from({ length: ROWS }, () => Array.from({ length: 80 }, () => 1 + Math.floor(rr() * 3)))
}

function learnerPos(s, L, t) {
  const drift = (7 * Math.min(s.W, s.H)) / 700
  const hx = L.hx + Math.sin(t * 0.9 + L.ph) * drift
  const hy = L.hy + Math.cos(t * 0.8 + L.ph * 1.3) * drift
  if (L.g < 0) return [hx, hy]
  const u = ease(pr(t, GATHER + (L.delay % 0.5), 1.0))
  return [lerp(hx, L.gx + Math.sin(t * 1.2 + L.ph) * 1.6, u), lerp(hy, L.gy + Math.cos(t * 1.1 + L.ph) * 1.6, u)]
}

/** 카드의 점들: [{x, y, r, col, a, row}] — 줄(row)마다 대화 흐름이 왼쪽으로 흘러감 */
function cardDots(s, t) {
  const C = s.card
  const out = []
  const padX = Math.max(14, C.w * 0.08)
  const innerW = C.w - padX * 2
  const dx = innerW / (COLS - 1)
  const rowH = C.h / ROWS
  const gap = Math.min(7, rowH / 6.2)
  const hotU = ease(pr(t, HOT, 0.75))
  const lift = ease(pr(t, LIFT, 0.5))
  const speed = 5
  const scroll = Math.max(0, t - CARD_IN) * speed
  const i0 = Math.floor(scroll)
  const frac = scroll - i0
  for (let row = 0; row < ROWS; row++) {
    const hot = row === HOT_GROUP
    const slot = hot ? lerp(1, 0, lift) : row === 0 ? lerp(0, 1, lift) : row
    const cy = C.y + slot * rowH + rowH / 2
    const col = hot ? mix(IVORY, GOLD, hotU) : IVORY
    const dim = hot ? 1 : lerp(0.8, 0.35, hotU)
    for (let c = -1; c <= COLS; c++) {
      const cx = C.x + padX + (c - frac) * dx
      const edge = clamp(Math.min((cx - (C.x + padX * 0.4)) / dx, (C.x + C.w - padX * 0.4 - cx) / dx))
      if (edge <= 0) continue
      const base = s.seq[row][(((c + i0) % 80) + 80) % 80]
      const cu = clamp((cx - C.x) / C.w)
      const act = hot ? Math.min(6, base + Math.round(hotU * (1 + 3.4 * cu))) : base
      for (let k = 0; k < act; k++) {
        out.push({
          x: cx,
          y: cy + (k - (act - 1) / 2) * gap,
          r: hot ? lerp(1.5, 2.1, hotU) : 1.5,
          col,
          a: dim * edge * (hot ? lerp(0.8, 1, hotU) : 1),
          row,
          hot,
        })
      }
    }
  }
  return out
}

/** 화면에 그려진 이름(.hero-wm)을 재서, 글자 모양을 이루는 점들의 자리를 구합니다. */
function sampleName(s, hr) {
  const wm = document.querySelector('.hero-intro .hero-wm')
  const ruleEl = document.querySelector('.hero-intro .hero-rule')
  if (!wm || !ruleEl) return null
  const parts = Array.from(wm.querySelectorAll('.hero-wm-core, .hero-wm-lab'))
  if (!parts.length) return null
  const rr = ruleEl.getBoundingClientRect()
  if (!rr.width) return null
  const off = document.createElement('canvas')
  off.width = Math.max(1, Math.round(s.W))
  off.height = Math.max(1, Math.round(s.H))
  const ox = off.getContext('2d', { willReadFrequently: true })
  let fs = 0
  parts.forEach((el, i) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    fs = parseFloat(cs.fontSize) || fs
    ox.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    try {
      ox.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    } catch {
      /* 글자 간격 미지원 브라우저 */
    }
    ox.textBaseline = 'alphabetic'
    const text = el.textContent
    const m = ox.measureText(text)
    const asc = m.fontBoundingBoxAscent ?? fs * 0.9
    ox.fillStyle = i === 0 ? '#f00' : '#0f0'
    ox.fillText(text, r.left - hr.left, r.top - hr.top + asc)
  })
  const step = Math.max(3, Math.min(5, Math.round(fs / 26)))
  const data = ox.getImageData(0, 0, off.width, off.height).data
  const pts = []
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      const i = (y * off.width + x) * 4
      if (data[i + 3] > 140) pts.push({ x: x + step / 2, y: y + step / 2, gold: data[i] > data[i + 1] })
    }
  }
  if (pts.length < 40) return null
  const rule = []
  const x0 = rr.left - hr.left
  const x1 = rr.right - hr.left
  const y = rr.top + rr.height / 2 - hr.top
  const n = Math.max(24, Math.round((x1 - x0) / (step * 1.5)))
  for (let k = 0; k < n; k++) rule.push({ x: lerp(x0, x1, k / (n - 1)), y })
  return { pts, rule, step }
}

/** 점들을 출발 자리 → 글자 자리로 보내는 입자로 만듭니다. */
function makeParticles(s, t0src) {
  const r = rng(5)
  const src = { text: [], rule: [] }
  s.learners.forEach((L) => {
    const [x, y] = learnerPos(s, L, t0src)
    const hot = L.g === HOT_GROUP
    ;(hot ? src.rule : src.text).push({ x, y, col: hot ? GOLD : L.tone })
  })
  cardDots(s, t0src).forEach((d) => {
    ;(d.hot ? src.rule : src.text).push({ x: d.x, y: d.y, col: d.col })
  })
  const make = (targets, pool, isRule) =>
    targets.map((tg, k) => {
      const from = pool[k % pool.length]
      const sx = from.x + (r() - 0.5) * 6
      const sy = from.y + (r() - 0.5) * 6
      const dxm = tg.x - sx
      const dym = tg.y - sy
      const dist = Math.hypot(dxm, dym) || 1
      const bend = (r() > 0.5 ? 1 : -1) * dist * (0.12 + r() * 0.2)
      return {
        sx,
        sy,
        tx: tg.x,
        ty: tg.y,
        cx: (sx + tg.x) / 2 - (dym / dist) * bend,
        cy: (sy + tg.y) / 2 + (dxm / dist) * bend,
        delay: (isRule ? 0.05 : 0.02) + 0.2 * clamp(tg.x / s.W) + r() * 0.1,
        from: from.col,
        to: isRule ? GOLD : tg.gold ? GOLD : IVORY,
        rule: isRule,
      }
    })
  s.parts = [...make(s.name.pts, src.text, false), ...make(s.name.rule, src.rule, true)]
}

function draw(ctx, s, t) {
  const { W, H } = s
  ctx.clearRect(0, 0, W, H)
  const fadeAll = 1 - ease(pr(t, FADE_OUT, 0.55))
  if (fadeAll <= 0.002) return

  // ── 학습자 점 ──
  const srcFade = 1 - ease(pr(t, FLOW, 0.45))
  const hotU = ease(pr(t, HOT, 0.75))
  const tHot = ease(pr(t, HOT, 0.5))
  s.learners.forEach((L) => {
    const [x, y] = learnerPos(s, L, t)
    const appear = ease(pr(t, DUST_IN + L.delay, 0.7))
    const gU = L.g < 0 ? 0 : ease(pr(t, GATHER, 1.0))
    let a = appear * (L.g < 0 ? lerp(0.7, 0.22, gU) : 0.9)
    let col = L.tone
    let r = L.r
    if (L.g >= 0) {
      if (L.g === HOT_GROUP) {
        col = mix(L.tone, GOLD, tHot)
        r = lerp(r, r * 1.25, tHot)
      } else a *= lerp(1, 0.4, hotU)
    } else a *= lerp(1, 0.3, hotU)
    a *= srcFade
    if (a <= 0.003) return
    ctx.fillStyle = rgba(col, a)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  })

  // 점등된 모둠 둘레의 고리 (금색 신호가 퍼져 나감)
  if (hotU > 0.01 && srcFade > 0.01) {
    const c = s.centers[HOT_GROUP]
    ;[1.55, 2.1].forEach((k, i) => {
      const u = ease(pr(t, HOT + i * 0.18, 0.7))
      if (u <= 0) return
      ctx.strokeStyle = rgba(GOLD, (i ? 0.22 : 0.5) * u * srcFade)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(c[0], c[1], s.gr * k * (0.7 + 0.3 * u), 0, Math.PI * 2)
      ctx.stroke()
    })
  }

  // ── 점 카드 ──
  const cardA = ease(pr(t, CARD_IN, 0.6)) * srcFade
  if (cardA > 0.003) {
    const C = s.card
    ctx.fillStyle = `rgba(255,255,255,${0.05 * cardA})`
    ctx.strokeStyle = rgba(GOLD, (0.3 + 0.5 * hotU) * cardA)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(C.x, C.y, C.w, C.h, 8)
    ctx.fill()
    ctx.stroke()
    const rowH = C.h / ROWS
    cardDots(s, t).forEach((d) => {
      ctx.fillStyle = rgba(d.col, d.a * cardA)
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fill()
    })
    // 점등된 줄을 감싸는 금색 테두리
    if (hotU > 0.02) {
      const lift = ease(pr(t, LIFT, 0.5))
      const slot = lerp(1, 0, lift)
      ctx.strokeStyle = rgba(GOLD, 0.85 * hotU * cardA)
      ctx.beginPath()
      ctx.roundRect(C.x + 6, C.y + slot * rowH + 4, C.w - 12, rowH - 8, 6)
      ctx.stroke()
    }
  }

  // ── 글자로 흘러가는 점 ──
  if (t >= FLOW && s.parts) {
    const rad = Math.max(1.05, s.name.step * 0.32)
    s.parts.forEach((p) => {
      const u = ease(pr(t, FLOW + p.delay, FLOW_DUR))
      if (u <= 0) return
      const v = 1 - u
      const x = v * v * p.sx + 2 * v * u * p.cx + u * u * p.tx
      const y = v * v * p.sy + 2 * v * u * p.cy + u * u * p.ty
      const a = clamp(u * 6) * (p.rule ? 0.85 : 0.95) * fadeAll
      if (a <= 0.003) return
      ctx.fillStyle = rgba(mix(p.from, p.to, u), a)
      ctx.beginPath()
      ctx.arc(x, y, lerp(1.7, p.rule ? rad * 0.9 : rad, u), 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

export default function HeroTrace({ animated, skipped = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !animated || skipped) {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height)
      return undefined
    }
    const ctx = cv.getContext('2d')
    const host = cv.parentElement
    const s = { W: 0, H: 0, name: null, parts: null }
    const size = () => {
      s.W = host.clientWidth || window.innerWidth
      s.H = host.clientHeight || window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(s.W * dpr)
      cv.height = Math.round(s.H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      layout(s)
      build(s)
      s.name = null
      s.parts = null
    }
    size()
    const t0 = performance.now()
    let raf = 0
    let fontsReady = !document.fonts
    document.fonts?.ready?.then(() => {
      fontsReady = true
      s.name = null
    })
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      // 글자 자리는 글꼴이 준비된 뒤, 점들이 흘러 나가기 직전에 한 번 잽니다(창 크기가 바뀌면 다시).
      if (!s.name && fontsReady && t > FLOW - 0.9) {
        const hr = cv.getBoundingClientRect()
        s.name = sampleName(s, hr)
        s.parts = null
      }
      if (s.name && !s.parts && t >= FLOW) makeParticles(s, Math.max(t, FLOW))
      // 글자 자리를 못 재면(글꼴 로드 실패 등) 점들은 조용히 사라지고 실제 이름이 나타납니다.
      draw(ctx, s, t)
      if (t < END) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, s.W, s.H)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', size)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', size)
    }
  }, [animated, skipped])
  return <canvas ref={ref} className="hero-chalk hero-trace-canvas" aria-hidden="true" />
}
