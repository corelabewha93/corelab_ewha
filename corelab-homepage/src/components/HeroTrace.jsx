import { useEffect, useRef } from 'react'
import '../styles/hero-trace.css'

/**
 * B안(보완) — "함께 배운 흔적"을 협력학습 연구의 두 분석 그림으로 보여 줍니다.
 *
 *  0–0.5s   짙은 녹색 위에 학습자(점) 여섯 명이 조용히 나타남
 *  0.5–2.9s ① SNA(사회연결망 분석) — 누가 누구와 이야기하는가
 *           말 한마디가 작은 빛으로 선을 따라 건너가고, 오갈수록 선이 굵어지고
 *           많이 참여한 사람의 점이 커짐(연결 중심성)
 *  2.9–4.7s ② ENA(인식적 네트워크 분석) — 어떤 생각들이 함께 등장하는가
 *           학습자 그림은 옅어지고, 두 축이 그어진 평면 위에 담화 코드
 *           (SHARE · QUESTION · ELABORATE · NEGOTIATE · REFLECT)가 놓임.
 *           함께 나온 코드끼리 선이 굵어지고, 집단의 무게중심(중심점)이 자리를 잡음
 *  4.7–5.3s 네트워크가 이름 자리로 모이며, 가장 굵게 이어진 두 코드(QUESTION · ELABORATE)가
 *           이름 아래 가로선의 양 끝에 착지
 *  5.3–5.7s 두 점을 잇던 연결선이 양옆으로 늘어나 이름 아래의 가는 가로선이 되고,
 *           그 선 위로 "CoRe Lab" 글자가 떠오름 ("연결 위에 선 CoRe")
 *  이후     CoRe Lab 워드마크 · 부제 세 줄은 HeroIntro.jsx(CSS)가 같은 속도 곡선으로 띄움
 * 모든 움직임의 속도 곡선은 하나: cubic-bezier(0.22, 1, 0.36, 1)
 */

// 재생 속도 — 교수님 피드백("로딩 기다리는 느낌")으로 전체를 약 7초 → 약 4.4초로 줄였습니다.
// 아래 시간표(초)는 그대로 두고, 실제로는 SPEED배 빠르게 재생합니다.
const SPEED = 1.6
const LAND_T = 5.3 // (시간표 기준) 두 코드가 가로선 양 끝에 착지
const RULE_T = LAND_T + 0.4 // (시간표 기준) 연결선이 이름 아래 가로선으로 다 바뀜
const END = RULE_T + 0.2
// 바깥(HeroIntro·CSS)에서 쓰는 실제 초
export const TRACE_LAND = LAND_T / SPEED // ≈ 3.31s
export const TRACE_RULE = RULE_T / SPEED // ≈ 3.56s

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
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

// ── ① SNA: 학습자 여섯 명과 말이 오간 순서 [보낸 사람, 받은 사람, 시각] ──
const LEARNERS = [
  [-0.62, -0.38],
  [0.05, -0.72],
  [0.66, -0.3],
  [0.58, 0.48],
  [-0.08, 0.7],
  [-0.7, 0.36],
]
const TALK = (() => {
  const pairs = [
    [0, 1], [1, 2], [2, 0], [3, 2], [1, 3], [4, 3], [5, 4], [0, 5],
    [2, 4], [4, 1], [5, 2], [3, 0], [1, 5], [4, 0], [2, 3], [5, 3], [0, 4], [3, 1],
  ]
  // 처음엔 띄엄띄엄, 점점 잦아짐
  return pairs.map((p, k) => [p[0], p[1], 0.62 + 2.0 * Math.pow(k / pairs.length, 0.72)])
})()
const HOP = 0.32 // 말 한마디가 건너가는 시간
const SNA_OUT = 2.9

// ── ② ENA: 담화 코드(고정 위치)와 함께 등장한 순서 [코드 a, 코드 b, 시각] ──
const CODES = [
  ['SHARE', -0.72, -0.18],
  ['QUESTION', -0.18, -0.74],
  ['ELABORATE', 0.62, -0.42],
  ['NEGOTIATE', 0.5, 0.56],
  ['REFLECT', -0.3, 0.66],
]
const ENA_IN = 3.05
const CO = [
  [0, 1, 3.35],
  [1, 2, 3.5],
  [0, 2, 3.62],
  [2, 3, 3.75],
  [1, 3, 3.86],
  [3, 4, 3.97],
  [2, 4, 4.07],
  [1, 2, 4.16],
  [0, 3, 4.24],
  [2, 3, 4.31],
  [1, 4, 4.38],
  [2, 4, 4.44],
]
const GATHER = [4.7, LAND_T]

function layoutBox(s) {
  const { W, H } = s
  const wide = W / H >= 0.85
  const bw = wide ? Math.min(W * 0.36, 560) : Math.min(W * 0.4, 200)
  const bh = wide ? Math.min(H * 0.27, 230) : Math.min(H * 0.24, 230)
  return { cx: W / 2, cy: H * (wide ? 0.47 : 0.45), bw, bh, wide }
}

function learnerPos(s, i, t) {
  const B = s.box
  const [ux, uy] = LEARNERS[i]
  const w = Math.min(B.bw, B.bh) * 0.06
  return [B.cx + ux * B.bw + Math.sin(t * 0.9 + i * 1.7) * w, B.cy + uy * B.bh + Math.cos(t * 0.8 + i * 2.3) * w]
}
// 코드 자리: ENA가 진행될수록 네트워크 전체가 로고 쪽으로 조금씩 떠오름
const codePos = (s, i, t = 0) => {
  const lift = s.targets ? (s.targets[0].y - s.box.cy) * 0.35 * ease(pr(t, 3.6, 1.2)) : 0
  return [s.box.cx + CODES[i][1] * s.box.bw, s.box.cy + CODES[i][2] * s.box.bh + lift]
}
const LAND = { 1: 0, 2: 1 } // QUESTION → 가로선 왼쪽 끝, ELABORATE → 오른쪽 끝

function caption(ctx, s, text, a) {
  if (a <= 0.003) return
  const { W, H } = s
  ctx.save()
  ctx.font = `600 ${s.box.wide ? 13 : 10}px ${s.sans}`
  ctx.letterSpacing = '2.2px'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const y = s.box.wide ? H * 0.86 : H * 0.84
  ctx.fillStyle = rgba(IVORY, 0.62 * a)
  ctx.fillText(text, W / 2, y)
  ctx.restore()
}

function draw(ctx, s, t) {
  const { W, H } = s
  ctx.clearRect(0, 0, W, H)
  const tg = s.targets
  const C = tg ? [(tg[0].x + tg[1].x) / 2, (tg[0].y + tg[1].y) / 2] : [W / 2, H * 0.4]

  // ───── ① SNA ─────
  const snaOut = 1 - ease(pr(t, SNA_OUT, 0.5))
  if (snaOut > 0.003) {
    const deg = [0, 0, 0, 0, 0, 0]
    const wgt = {}
    const P = LEARNERS.map((_, i) => learnerPos(s, i, t))
    TALK.forEach(([a, b, at]) => {
      const u = ease(pr(t, at + HOP, 0.35))
      if (u <= 0) return
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      wgt[key] = (wgt[key] || 0) + u
      deg[a] += u * 0.5
      deg[b] += u
    })
    // 연결선: 오간 만큼 굵고 진해짐
    Object.entries(wgt).forEach(([key, w]) => {
      const [a, b] = key.split('-').map(Number)
      ctx.strokeStyle = rgba(IVORY, (0.16 + 0.14 * Math.min(w, 3)) * snaOut)
      ctx.lineWidth = 0.8 + 1.1 * Math.min(w, 3)
      ctx.beginPath()
      ctx.moveTo(P[a][0], P[a][1])
      ctx.lineTo(P[b][0], P[b][1])
      ctx.stroke()
    })
    // 말 한마디: 보낸 사람에게서 받는 사람에게로 건너가는 작은 빛
    TALK.forEach(([a, b, at], k) => {
      const u = pr(t, at, HOP)
      if (u <= 0 || u >= 1) return
      const e = ease(u)
      const x = lerp(P[a][0], P[b][0], e)
      const y = lerp(P[a][1], P[b][1], e)
      const c = k % 2 ? MINT : GOLD
      ctx.fillStyle = rgba(c, 0.95 * snaOut * Math.sin(u * Math.PI))
      ctx.beginPath()
      ctx.arc(x, y, s.box.wide ? 4.2 : 3.2, 0, Math.PI * 2)
      ctx.fill()
    })
    // 학습자: 많이 주고받을수록 커짐
    P.forEach((p, i) => {
      const appear = ease(pr(t, i * 0.06, 0.45))
      const r = 4 + 1.9 * Math.sqrt(deg[i])
      ctx.fillStyle = rgba(i === 2 ? MINT : IVORY, appear * (0.35 + 0.65 * snaOut))
      ctx.beginPath()
      ctx.arc(p[0], p[1], r * (0.6 + 0.4 * snaOut), 0, Math.PI * 2)
      ctx.fill()
    })
  }
  caption(ctx, s, 'WHO LEARNS WITH WHOM', ease(pr(t, 0.75, 0.5)) * (1 - ease(pr(t, SNA_OUT - 0.1, 0.35))))

  // ───── ② ENA ─────
  if (t >= ENA_IN - 0.2) {
    const g = ease(pr(t, GATHER[0], GATHER[1] - GATHER[0]))
    const k = 1 - 0.92 * g
    const fold = (p) => [C[0] + (p[0] - C[0]) * k, C[1] + (p[1] - C[1]) * k]
    const fade = 1 - g
    const B = s.box
    const lift = tg ? (tg[0].y - B.cy) * 0.35 * ease(pr(t, 3.6, 1.2)) : 0
    // 두 축(인식적 네트워크의 평면)
    const ax = ease(pr(t, ENA_IN - 0.15, 0.6))
    if (ax > 0 && fade > 0) {
      ctx.strokeStyle = rgba(IVORY, 0.16 * fade)
      ctx.lineWidth = 1
      const cy0 = B.cy + lift
      const L1 = fold([B.cx - B.bw * 1.12 * ax, cy0])
      const R1 = fold([B.cx + B.bw * 1.12 * ax, cy0])
      const T1 = fold([B.cx, cy0 - B.bh * 1.05 * ax])
      const D1 = fold([B.cx, cy0 + B.bh * 1.05 * ax])
      ctx.beginPath()
      ctx.moveTo(L1[0], L1[1])
      ctx.lineTo(R1[0], R1[1])
      ctx.moveTo(T1[0], T1[1])
      ctx.lineTo(D1[0], D1[1])
      ctx.stroke()
    }
    // 함께 등장한 코드끼리의 선(가중치)
    const w = {}
    const nodeW = [0, 0, 0, 0, 0]
    CO.forEach(([a, b, at]) => {
      const u = ease(pr(t, at, 0.4))
      if (u <= 0) return
      const key = `${a}-${b}`
      w[key] = (w[key] || 0) + u
      nodeW[a] += u
      nodeW[b] += u
    })
    // 코드 자리: 착지하는 두 코드는 로고 점 자리로, 나머지는 로고 쪽으로 접혀 들어가며 사라짐
    const CP = CODES.map((_, i) => {
      const p = codePos(s, i, t)
      if (tg && LAND[i] !== undefined) {
        const d = tg[LAND[i]]
        return [lerp(p[0], d.x, g), lerp(p[1], d.y, g)]
      }
      return fold(p)
    })
    const landed = t >= LAND_T
    Object.entries(w).forEach(([key, val], n) => {
      const [a, b] = key.split('-').map(Number)
      const bridge = key === '1-2' // 두 학습자를 잇는 선 → 로고의 어깨선이 됨
      if (bridge && landed) return
      const col = bridge ? MINT : n % 3 === 1 ? MINT : GOLD
      const al = bridge ? 0.5 + 0.45 * g : (0.3 + 0.2 * Math.min(val, 2)) * fade
      ctx.strokeStyle = rgba(col, al)
      ctx.lineWidth = bridge ? lerp(1 + 1.6 * Math.min(val, 2), 2.6, g) : (1 + 1.6 * Math.min(val, 2)) * (0.5 + 0.5 * k)
      ctx.beginPath()
      ctx.moveTo(CP[a][0], CP[a][1])
      ctx.lineTo(CP[b][0], CP[b][1])
      ctx.stroke()
    })
    // 코드 점과 이름
    CODES.forEach(([name], i) => {
      const appear = ease(pr(t, ENA_IN + i * 0.07, 0.45))
      if (appear <= 0) return
      const p = CP[i]
      const lands = tg && LAND[i] !== undefined
      if (lands && t >= RULE_T) return
      let r = (3.2 + 1.5 * Math.sqrt(nodeW[i])) * (0.4 + 0.6 * k)
      let col = IVORY
      let al = appear * fade
      if (lands) {
        al = appear * (1 - ease(pr(t, LAND_T, RULE_T - LAND_T)))
        r = lerp(3.2 + 1.5 * Math.sqrt(nodeW[i]), 3.4, g)
        col = LAND[i] ? MINT : IVORY
      }
      ctx.fillStyle = rgba(col, al)
      ctx.beginPath()
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
      ctx.fill()
      const right = CODES[i][1] >= 0
      ctx.save()
      ctx.font = `600 ${B.wide ? 12.5 : 9.5}px ${s.sans}`
      ctx.letterSpacing = '1.6px'
      ctx.textAlign = right ? 'left' : 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(IVORY, 0.6 * appear * (1 - ease(pr(t, GATHER[0] - 0.15, 0.3))))
      ctx.fillText(name, p[0] + (right ? 1 : -1) * (r + 9), p[1])
      ctx.restore()
    })
    // 집단의 무게중심: 가중치가 쌓일수록 자리를 옮겨 감 (모이기 시작하면 사라짐)
    let sx = 0
    let sy = 0
    let sw = 0
    CODES.forEach((_, i) => {
      const p = codePos(s, i, t)
      sx += p[0] * (nodeW[i] + 0.4)
      sy += p[1] * (nodeW[i] + 0.4)
      sw += nodeW[i] + 0.4
    })
    const cen = fold([sx / sw, sy / sw])
    const ca = ease(pr(t, ENA_IN + 0.35, 0.5)) * (1 - ease(pr(t, GATHER[0] - 0.1, 0.3)))
    if (ca > 0.003) {
      const rr = 7
      ctx.strokeStyle = rgba(MINT, 0.9 * ca)
      ctx.lineWidth = 1.4
      ctx.strokeRect(cen[0] - rr, cen[1] - rr, rr * 2, rr * 2)
      ctx.fillStyle = rgba(MINT, 0.9 * ca)
      ctx.beginPath()
      ctx.arc(cen[0], cen[1], 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    caption(ctx, s, 'HOW IDEAS CONNECT', ease(pr(t, ENA_IN + 0.2, 0.5)) * (1 - ease(pr(t, GATHER[0] - 0.1, 0.35))))

    // ③ 두 점을 잇던 연결선이 양옆으로 늘어나 이름 아래의 가로선이 됨
    if (landed && t < RULE_T && tg && s.rule) {
      const u = ease(pr(t, LAND_T, RULE_T - LAND_T))
      const R = s.rule
      const x0 = lerp(tg[0].x, R.x0, u)
      const x1 = lerp(tg[1].x, R.x1, u)
      const y = lerp(tg[0].y, R.y, u)
      const gr = ctx.createLinearGradient(x0, 0, x1, 0)
      const edge = lerp(0.95, 0, u)
      gr.addColorStop(0, rgba(IVORY, edge))
      gr.addColorStop(0.5, rgba(u < 0.5 ? MINT : IVORY, lerp(0.95, 0.55, u)))
      gr.addColorStop(1, rgba(MINT, edge))
      ctx.strokeStyle = gr
      ctx.lineWidth = lerp(2.6, 1, u)
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
      ctx.stroke()
    }
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
    const s = { W: 0, H: 0, targets: null, rule: null, box: null, sans: 'sans-serif' }
    try {
      s.sans = getComputedStyle(document.body).fontFamily || s.sans
    } catch {
      /* 기본 글꼴 */
    }
    const size = () => {
      s.W = host.clientWidth || window.innerWidth
      s.H = host.clientHeight || window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(s.W * dpr)
      cv.height = Math.round(s.H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      s.box = layoutBox(s)
      s.targets = null
      s.rule = null
    }
    size()
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const t = ((performance.now() - t0) / 1000) * SPEED
      if (!s.targets) {
        const hr = cv.getBoundingClientRect()
        // 착지 자리 = 이름 아래 가는 가로선(.hero-rule)의 양 끝 근처
        const el = document.querySelector('.hero-intro .hero-rule')
        const r = el && el.getBoundingClientRect()
        if (r && r.width) {
          const y = r.top + r.height / 2 - hr.top
          const x0 = r.left - hr.left
          const x1 = r.right - hr.left
          s.rule = { x0, x1, y }
          const inset = (x1 - x0) * 0.2
          s.targets = [
            { x: x0 + inset, y, r: 3 },
            { x: x1 - inset, y, r: 3 },
          ]
        }
      }
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
