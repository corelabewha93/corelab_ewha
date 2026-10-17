import { useEffect, useRef } from 'react'
import '../styles/hero-trace.css'

/**
 * 메인 인트로 — From Interaction to Shared Understanding (약 5초, 장면 안에는 글자 없음)
 *
 *  0.1–1.0s  개별 생각: 세 학습자(금 · 하늘 · 장밋빛)가 차례로 나타남
 *  0.95–2.9s 상호작용: 한 사람이 생각(작은 빛)을 보내면, 받은 사람 둘레에 "보낸 사람 색"의 조각이 생김.
 *            주고받기가 이어질수록 각자의 둘레에 다른 사람들의 생각 조각이 쌓임
 *  2.8–3.6s  공동 지식구축: 모두가 받은 조각들이 가운데로 모여 하나의 고리를 이룸
 *            (세 사람의 조각이 다 모여야 원이 닫힘 — 색은 섞이지 않고 그대로 남음)
 *  3.6–3.9s  공유된 이해: 틈이 닫히며 고리가 완성되고, 잔잔한 물결이 한 번 퍼짐
 *  3.95–4.55s 고리가 위에서부터 열리며 이름 아래 가로선으로 펼쳐지고, 색은 조용히 흰색으로 모임 → 그 선 위로 CoRe Lab이 솟아오름(CSS)
 *  이후      부제 · 모토 · 소속이 차례로(CSS). 캔버스는 지우고 계산을 멈춤
 *
 * 자리는 화면에 실제로 그려진 가로선(.hero-rule)을 기준으로 잡습니다(글꼴 · 화면 크기가 바뀌어도 맞음).
 * 클릭 건너뛰기 · 재방문 · 동작 줄이기는 HeroIntro.jsx가 처리합니다(이 경우 캔버스는 그리지 않음).
 */

const END = 4.8
// 바깥(HeroIntro · hero-trace.css)과 맞춘 시각(초): 진짜 가로선이 나타나는 때
export const TRACE_RULE = 4.55
export const TRACE_LAND = 4.55

// 진한 초록 위에서 서로 또렷이 구분되면서도 차분한 세 색
const COL = {
  A: [233, 196, 106], // 금
  B: [120, 196, 214], // 하늘
  C: [228, 164, 170], // 장밋빛(배꽃)
}

// 학습자: 고리 중심에서의 위치(px, 배율 k를 곱함)와 나타나는 시각
const NODES = [
  { id: 'A', x: -215, y: -70, t: 0.1 },
  { id: 'B', x: 185, y: -105, t: 0.3 },
  { id: 'C', x: 30, y: 135, t: 0.5 },
]
// 주고받기: [보내는 사람, 받는 사람, 출발 시각] — 답이 돌아오는 순서
const EX = [
  ['A', 'B', 0.95],
  ['B', 'A', 1.35],
  ['B', 'C', 1.55],
  ['C', 'A', 1.85],
  ['A', 'C', 2.05],
  ['C', 'B', 2.25],
]
// 받은 조각이 들어갈 고리의 자리(시계 방향 6칸) — 금 · 하늘 · 장밋빛이 번갈아 놓임
// (펼친 가로선의 색 순서는 왼쪽부터 장밋빛 · 하늘 · 금 · 장밋빛 · 하늘 · 금 = hero-trace.css와 같음)
const SLOT = { 'A>B': 0, 'B>A': 1, 'C>A': 2, 'A>C': 3, 'B>C': 4, 'C>B': 5 }

const PULSE = 0.42 // 생각 하나가 건너가는 시간
const GATHER = 2.75 // 조각들이 가운데로 모이기 시작
const CLOSE = 3.62 // 고리가 닫힘
const UNROLL = 3.95 // 고리가 펼쳐져 가로선으로
const UNROLL_DUR = 0.6
const OUT = 4.6 // 캔버스의 선을 거둠(진짜 흰색 가로선은 TRACE_RULE에 이미 나타나 있음)

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
const ease = bez(0.22, 1, 0.36, 1) // 사이트 전체와 같은 속도 곡선(등장)
const inOut = bez(0.45, 0, 0.25, 1) // 이동용(천천히 출발 → 부드럽게 도착)
const clamp = (x) => Math.max(0, Math.min(1, x))
const pr = (t, s, d) => clamp((t - s) / d)
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`
const TAU = Math.PI * 2

function quadPoint(a, b, bend, u) {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const c = [mx - dy * bend, my + dx * bend]
  const v = 1 - u
  return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]
}

/** 화면 크기와 실제 가로선 자리를 재서 장면의 좌표를 정합니다. */
function layout(s, cvRect, ruleEl) {
  const { W, H } = s
  const wide = W / H >= 0.85 && W >= 620
  s.k = wide ? Math.max(0.75, Math.min(1.05, Math.min(W, 1500) / 1366)) : Math.max(0.52, Math.min(0.75, (W / 390) * 0.58))
  let rx = W / 2
  let ry = H * 0.5
  let rw = Math.min(360, W * 0.6)
  if (ruleEl) {
    const r = ruleEl.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) {
      rx = r.left - cvRect.left + r.width / 2
      ry = r.top - cvRect.top + r.height / 2
      if (r.width > 0) rw = r.width
    }
  }
  s.R = 68 * s.k // 공동의 고리 반지름
  s.NR = Math.max(8, 13 * s.k) // 학습자 반지름
  s.lineY = ry
  s.lineW = rw
  s.cx = rx
  s.cy = ry - s.R // 고리의 아랫부분이 가로선 자리에 닿도록
}

function draw(ctx, s, t) {
  const { W, H, k, R, NR, cx, cy } = s
  ctx.clearRect(0, 0, W, H)
  const kk = Math.max(k, 0.8)
  const idx = (id) => NODES.findIndex((n) => n.id === id)

  const gather = inOut(pr(t, GATHER, 0.85))
  const nodeFade = 1 - ease(pr(t, 3.9, 0.45))
  const pathFade = 1 - ease(pr(t, 2.7, 0.6))
  const P = NODES.map((n) => {
    const a = ease(pr(t, n.t, 0.7))
    const sc = 1 - 0.14 * gather // 모일 때 한 걸음 가까이
    return [cx + n.x * k * sc, cy + n.y * k * sc + (1 - a) * 10 * k, a]
  })

  // ── 주고받은 길: 생각이 건너간 자리에 옅은 곡선이 남음 ──
  ctx.lineCap = 'round'
  EX.forEach(([f, to, t0]) => {
    const u = pr(t, t0, PULSE)
    if (u <= 0 || pathFade <= 0) return
    const a = P[idx(f)]
    const b = P[idx(to)]
    const col = COL[f]
    const bend = f < to ? 0.14 : -0.14
    const arrived = pr(t, t0 + PULSE, 0.6)
    ctx.strokeStyle = rgba(col, (0.18 + 0.2 * (1 - arrived)) * pathFade)
    ctx.lineWidth = 1.1 * kk
    const m = inOut(u)
    ctx.beginPath()
    for (let i = 0; i <= 30; i++) {
      const q = quadPoint(a, b, bend, 0.07 + 0.86 * m * (i / 30))
      if (i) ctx.lineTo(q[0], q[1])
      else ctx.moveTo(q[0], q[1])
    }
    ctx.stroke()
    if (u < 1) {
      const q = quadPoint(a, b, bend, 0.07 + 0.86 * m)
      ctx.fillStyle = rgba(col, 1)
      ctx.shadowColor = rgba(col, 0.55)
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(q[0], q[1], 3.8 * kk, 0, TAU)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  })

  // ── 받은 생각의 조각 → 가운데로 모여 하나의 고리 → 펼쳐져 가로선 ──
  const close = inOut(pr(t, CLOSE, 0.25))
  const unroll = inOut(pr(t, UNROLL, UNROLL_DUR))
  const outA = 1 - pr(t, OUT, 0.15)
  const GAP = 7 // 닫히기 전 조각 사이 틈(도)
  EX.forEach(([f, to, t0], i) => {
    const arr = t0 + PULSE
    const g = ease(pr(t, arr, 0.3))
    if (g <= 0) return
    const col = COL[f]
    const b = P[idx(to)]
    const a = P[idx(f)]
    const dir = Math.atan2(a[1] - b[1], a[0] - b[0]) // 보낸 사람 쪽을 향한 조각
    const mv = inOut(pr(t, GATHER + 0.05 + i * 0.07, 0.7))
    const r0 = NR + 10 * k
    const span0 = ((80 * Math.PI) / 180) * g
    const span1 = ((60 - GAP * (1 - close)) * Math.PI) / 180
    const c1 = -Math.PI / 2 + ((SLOT[`${f}>${to}`] + 0.5) * Math.PI) / 3
    let dc = c1 - dir
    while (dc > Math.PI) dc -= TAU
    while (dc < -Math.PI) dc += TAU
    const ox = b[0] + (cx - b[0]) * mv
    const oy = b[1] + (cy - b[1]) * mv
    const rr = r0 + (R - r0) * mv
    const cc = dir + dc * mv
    const sp = span0 + (span1 - span0) * mv
    // 펼쳐지는 동안 각자의 색이 조용히 흰색으로 모여, 마지막 가로선은 하얀 한 줄로 끝남
    const white = ease(pr(t, UNROLL + 0.05, UNROLL_DUR * 0.9))
    const lineCol = [col[0] + (255 - col[0]) * white, col[1] + (255 - col[1]) * white, col[2] + (255 - col[2]) * white]
    ctx.strokeStyle = rgba(lineCol, (0.96 - 0.11 * white) * outA)
    ctx.lineWidth = (4 + 0.8 * mv) * kk * (1 - 0.58 * unroll)
    ctx.lineCap = unroll > 0.85 ? 'butt' : 'round'
    const glow = Math.sin(Math.PI * clamp(close * 0.5 + unroll * 0.5)) * (1 - unroll)
    if (glow > 0.01) {
      ctx.shadowColor = rgba(lineCol, 0.55 * glow)
      ctx.shadowBlur = 12 * glow
    }
    ctx.beginPath()
    for (let j = 0; j <= 24; j++) {
      const ang = cc - sp / 2 + (sp * j) / 24
      let x = ox + Math.cos(ang) * rr
      let y = oy + Math.sin(ang) * rr
      if (unroll > 0) {
        // 고리의 맨 위를 끊어, 양쪽이 바닥을 따라 펼쳐지듯 가로선으로
        let phi = ang - Math.PI / 2
        while (phi <= -Math.PI) phi += TAU
        while (phi > Math.PI) phi -= TAU
        const lx = cx - (phi / Math.PI) * (s.lineW / 2)
        x += (lx - x) * unroll
        y += (s.lineY - y) * unroll
      }
      if (j) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  })

  // 고리가 완성되는 순간: 잔잔한 물결 한 번
  const wave = pr(t, CLOSE + 0.1, 0.6)
  if (wave > 0 && wave < 1) {
    ctx.strokeStyle = `rgba(255,248,232,${0.32 * (1 - wave)})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, R + 8 * k + 44 * k * ease(wave), 0, TAU)
    ctx.stroke()
  }

  // ── 학습자 ──
  NODES.forEach((n, i) => {
    const [x, y, a] = P[i]
    const al = a * nodeFade
    if (al <= 0.003) return
    const col = COL[n.id]
    const recv = EX.some(([, to, t0]) => to === n.id && t >= t0 + PULSE && t < t0 + PULSE + 0.25)
    const send = EX.some(([f, , t0]) => f === n.id && t >= t0 - 0.05 && t < t0 + 0.2)
    const r = NR * (recv ? 1.1 : send ? 1.05 : 1)
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5)
    halo.addColorStop(0, rgba(col, 0.22 * al))
    halo.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, r * 2.5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = rgba(col, al)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
  })
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
    const ruleEl = host.querySelector('.hero-rule')
    const s = { W: 0, H: 0 }
    const size = () => {
      s.W = host.clientWidth || window.innerWidth
      s.H = host.clientHeight || window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(s.W * dpr)
      cv.height = Math.round(s.H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      // 글꼴이 늦게 들어와 이름 높이(= 가로선 자리)가 바뀌어도 따라가도록, 펼쳐질 때까지 매번 다시 잽니다.
      if (t < UNROLL + UNROLL_DUR || s.R === undefined) layout(s, cv.getBoundingClientRect(), ruleEl)
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
