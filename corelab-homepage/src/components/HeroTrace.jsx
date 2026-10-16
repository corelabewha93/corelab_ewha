import { useEffect, useRef } from 'react'
import '../styles/hero-trace.css'

/**
 * 메인 인트로 — "함께 이야기하는 모둠 → 대화가 기록되는 카드 → 도움이 필요한 순간 → CoRe Lab" (약 6초, 글자 없이)
 *
 *  0–1.0s    짙은 녹색 위에 학습자(머리 + 어깨 실루엣)들이 흩어져 나타남
 *  0.8–2.0s  학습자들이 네 명씩 모둠으로 모여 앉음
 *  1.6–2.2s  점으로 만든 카드가 열림 (모둠마다 한 줄, 글자 없음)
 *  2.0–4.4s  모둠 안에서 말이 오감(학습자 사이를 건너가는 작은 빛).
 *            말 한마디마다 작은 점이 카드의 그 모둠 줄로 날아가 기록되고, 기록은 왼쪽으로 흘러감
 *  3.2s~     한 모둠의 대화가 거세짐 → 3.55s 그 줄이 금색으로 점등 → 맨 위로 올라오고,
 *            그 모둠 학습자들도 금빛으로 바뀌며 고리가 퍼짐 (다른 모둠은 옅어짐)
 *  4.45–5.3s 모든 점이 흘러가 "CoRe Lab" 글자 모양(CoRe 금색 · Lab 흰색)으로 모이고,
 *            금색 줄의 점들은 이름 아래 가로선 자리로 모임
 *  5.3–5.9s  점 글자가 같은 자리에서 선명한 글자(HeroIntro의 실제 이름)로 바뀜 (위치 이동 없음)
 *  이후      부제 · 모토 · 소속은 CSS(hero-trace.css)가 띄움
 * 글자 자리는 화면에 그려진 실제 이름(.hero-wm)의 기준선을 직접 재서 정합니다.
 * 모든 움직임의 속도 곡선은 하나: cubic-bezier(0.22, 1, 0.36, 1)
 */

const END = 6.0
// 바깥(HeroIntro · hero-trace.css)과 맞춘 시각(초)
export const TRACE_RULE = 5.4
export const TRACE_LAND = 5.2

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
const APPEAR = 0.0
const GATHER = 0.8
const CARD_IN = 1.6
const TALK_FROM = 1.9
const TALK_TO = 4.4
const SURGE = 3.2 // 한 모둠의 대화가 잦아지기 시작
const HOT = 3.55 // 그 줄이 금색으로 점등
const LIFT = 3.85 // 맨 위로 올라옴
const FLOW = 4.45 // 글자로 흘러감
const FLOW_DUR = 0.75
const FADE_OUT = 5.3

const GROUPS = 4
const PER_GROUP = 4
const DUST = 24
const HOT_GROUP = 1
const HOP = 0.34 // 말 한마디가 건너가는 시간
const SEND = 0.55 // 기록 점이 카드까지 날아가는 시간
const SCROLL_S = 2.4 // 기록이 카드 오른쪽 끝에서 왼쪽 끝까지 흘러가는 시간

function layout(s) {
  const { W, H } = s
  const wide = W / H >= 0.85
  s.wide = wide
  const m = Math.min(W, H)
  if (wide) {
    // 모둠과 카드가 한눈에 들어오도록 화면 가운데에 모아 둡니다 (아주 넓은 화면에서도 퍼지지 않게 기준 폭 U를 씁니다)
    const U = Math.min(W, 1400)
    const w = Math.min(U * 0.23, 290)
    const h = Math.min(H * 0.36, 250)
    s.card = { x: W / 2 + U * 0.15 - w / 2, y: H * 0.48 - h / 2, w, h }
    const gx = [-0.205, -0.075, -0.195, -0.065]
    const gy = [H * 0.3, H * 0.38, H * 0.63, H * 0.7]
    s.centers = gx.map((x, i) => [W / 2 + x * U, gy[i]])
    s.seat = m * 0.07
    s.hs = Math.max(3.6, Math.min(5.4, m / 140)) // 머리 반지름
  } else {
    const w = Math.min(W * 0.84, 340)
    const h = Math.min(H * 0.22, 150)
    s.card = { x: W / 2 - w / 2, y: H * 0.71 - h / 2, w, h }
    const gx = [W * 0.27, W * 0.7, W * 0.3, W * 0.72]
    const gy = [H * 0.17, H * 0.24, H * 0.42, H * 0.49]
    s.centers = gx.map((x, i) => [x, gy[i]])
    s.seat = m * 0.095
    s.hs = Math.max(2.8, Math.min(4, m / 110))
  }
}

function build(s) {
  const r = rng(11)
  // 학습자: 모둠마다 네 명, 원탁에 둘러앉듯 네 자리
  s.learners = []
  for (let g = 0; g < GROUPS; g++) {
    for (let k = 0; k < PER_GROUP; k++) {
      const a = -Math.PI / 2 + Math.PI / 4 + (k * Math.PI) / 2 + (r() - 0.5) * 0.35
      const d = s.seat * (0.85 + r() * 0.25)
      s.learners.push({
        g,
        k,
        hx: 30 + r() * (s.W - 60),
        hy: 40 + r() * (s.H - 80),
        sx: s.centers[g][0] + Math.cos(a) * d,
        sy: s.centers[g][1] + Math.sin(a) * d * 0.8,
        ph: r() * 6.28,
        tone: r() > 0.5 ? MINT : IVORY,
        delay: r() * 0.55,
      })
    }
  }
  s.dust = Array.from({ length: DUST }, () => ({
    x: 20 + r() * (s.W - 40),
    y: 20 + r() * (s.H - 40),
    r: 0.9 + r() * 1.2,
    ph: r() * 6.28,
    delay: r() * 0.8,
  }))
  // 대화: [모둠, 말한 사람, 들은 사람, 시각, 길이(기록 점 개수)]
  const rt = rng(29)
  s.talk = []
  // 카드가 열릴 때 이미 쌓여 있던 앞선 기록(카드에만 보임) — 빈 카드가 아니라 "진행 중인 기록"으로 읽히게
  for (let g = 0; g < GROUPS; g++) {
    let t = CARD_IN - SCROLL_S - SEND + rt() * 0.2
    while (t < TALK_FROM - SEND) {
      s.talk.push({ g, from: 0, to: 1, t, w: 1 + Math.floor(rt() * 3), hist: true })
      t += 0.2 + rt() * 0.18
    }
  }
  for (let g = 0; g < GROUPS; g++) {
    let t = TALK_FROM + rt() * 0.35
    while (t < TALK_TO) {
      const hot = g === HOT_GROUP && t > SURGE
      const from = Math.floor(rt() * PER_GROUP)
      const to = (from + 1 + Math.floor(rt() * (PER_GROUP - 1))) % PER_GROUP
      s.talk.push({ g, from, to, t, w: hot ? 2 + Math.floor(rt() * 4) : 1 + Math.floor(rt() * 3) })
      t += hot ? 0.07 + rt() * 0.05 : 0.2 + rt() * 0.18
    }
  }
}

function learnerPos(s, L, t) {
  const drift = (6 * Math.min(s.W, s.H)) / 700
  const hx = L.hx + Math.sin(t * 0.9 + L.ph) * drift
  const hy = L.hy + Math.cos(t * 0.8 + L.ph * 1.3) * drift
  const u = ease(pr(t, GATHER + L.delay * 0.6, 1.1))
  return [lerp(hx, L.sx + Math.sin(t * 1.3 + L.ph) * 0.8, u), lerp(hy, L.sy + Math.cos(t * 1.2 + L.ph) * 0.8, u)]
}

/** 학습자 실루엣(머리 + 어깨). (x, y) = 머리 가운데 */
function person(ctx, x, y, h, col, a) {
  if (a <= 0.003) return
  ctx.fillStyle = rgba(col, a)
  ctx.beginPath()
  ctx.arc(x, y, h, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x, y + h * 3.1, h * 2.05, h * 1.75, 0, Math.PI, Math.PI * 2)
  ctx.fill()
}

/** 실루엣을 이루는 점 자리들 (글자로 흘러갈 때의 출발점) */
function personPoints(x, y, h) {
  const pts = [[x, y]]
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + (Math.PI * (k + 0.5)) / 5
    pts.push([x + Math.cos(a) * h * 1.6, y + h * 3.1 + Math.sin(a) * h * 1.3])
  }
  return pts
}

function rowGeom(s) {
  const C = s.card
  const padX = Math.max(14, C.w * 0.08)
  const rowH = C.h / GROUPS
  return { C, padX, rowH, inX: C.x + C.w - padX, outX: C.x + padX, gap: Math.min(6.5, rowH / 6.4) }
}
function rowSlot(g, t) {
  const lift = ease(pr(t, LIFT, 0.5))
  if (g === HOT_GROUP) return lerp(HOT_GROUP, 0, lift)
  if (g === 0) return lerp(0, 1, lift)
  return g
}

/** 카드에 기록된 점들 (도착한 말 한마디마다 한 칸, 왼쪽으로 흘러감) */
function cardDots(s, t) {
  const R = rowGeom(s)
  const speed = (R.inX - R.outX) / SCROLL_S
  const hotU = ease(pr(t, HOT, 0.6))
  const out = []
  s.talk.forEach((e) => {
    const arrive = e.t + SEND
    if (t < arrive) return
    const x = R.inX - (t - arrive) * speed
    if (x < R.outX - 4) return
    const edge = clamp((x - R.outX + 4) / 14) * clamp((t - arrive) / 0.12)
    const hot = e.g === HOT_GROUP
    const cy = R.C.y + rowSlot(e.g, t) * R.rowH + R.rowH / 2
    const col = hot ? mix(IVORY, GOLD, hotU) : IVORY
    const a = (hot ? 1 : lerp(0.85, 0.35, hotU)) * edge
    for (let k = 0; k < e.w; k++) {
      out.push({ x, y: cy + (k - (e.w - 1) / 2) * R.gap, r: hot ? lerp(1.5, 2, hotU) : 1.5, col, a, hot })
    }
  })
  return out
}

/** 화면의 실제 이름(.hero-wm)에서 글자 모양을 이루는 점 자리를 구합니다. 기준선은 직접 재서 맞춥니다. */
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
    fs = parseFloat(cs.fontSize) || fs
    // 글자 기준선 = 높이 0짜리 표식을 글자 줄에 끼워 넣어 잰 자리
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    el.appendChild(probe)
    const base = probe.getBoundingClientRect().top
    probe.remove()
    const r = el.getBoundingClientRect()
    ox.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    try {
      ox.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    } catch {
      /* 글자 간격 미지원 브라우저 */
    }
    ox.textBaseline = 'alphabetic'
    ox.fillStyle = i === 0 ? '#f00' : '#0f0'
    ox.fillText(el.textContent, r.left - hr.left, base - hr.top)
  })
  const step = Math.max(3, Math.min(5, Math.round(fs / 30)))
  const data = ox.getImageData(0, 0, off.width, off.height).data
  const pts = []
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      const i = (y * off.width + x) * 4
      if (data[i + 3] > 140) pts.push({ x: x + 0.5, y: y + 0.5, gold: data[i] > data[i + 1] })
    }
  }
  if (pts.length < 40) return null
  const rule = []
  const x0 = rr.left - hr.left
  const x1 = rr.right - hr.left
  const y = rr.top + rr.height / 2 - hr.top
  const n = Math.max(24, Math.round((x1 - x0) / (step * 1.4)))
  for (let k = 0; k < n; k++) rule.push({ x: lerp(x0, x1, k / (n - 1)), y })
  return { pts, rule, step }
}

/** 지금 화면의 점들을 출발점으로, 글자 · 가로선 자리로 보내는 입자를 만듭니다. */
function makeParticles(s, t0) {
  const r = rng(5)
  const src = { text: [], rule: [] }
  const tHot = ease(pr(t0, HOT, 0.6))
  s.learners.forEach((L) => {
    const [x, y] = learnerPos(s, L, t0)
    const hot = L.g === HOT_GROUP
    personPoints(x, y, s.hs).forEach(([px, py]) =>
      (hot ? src.rule : src.text).push({ x: px, y: py, col: hot ? mix(L.tone, GOLD, tHot) : L.tone }),
    )
  })
  cardDots(s, t0).forEach((d) => (d.hot ? src.rule : src.text).push({ x: d.x, y: d.y, col: d.col }))
  s.dust.forEach((d) => src.text.push({ x: d.x, y: d.y, col: IVORY }))
  const make = (targets, pool, isRule) =>
    targets.map((tg, k) => {
      const from = pool[Math.floor(r() * pool.length)] || pool[k % pool.length]
      const sx = from.x + (r() - 0.5) * 5
      const sy = from.y + (r() - 0.5) * 5
      const dxm = tg.x - sx
      const dym = tg.y - sy
      const dist = Math.hypot(dxm, dym) || 1
      const bend = (r() > 0.5 ? 1 : -1) * dist * (0.1 + r() * 0.18)
      return {
        sx,
        sy,
        tx: tg.x,
        ty: tg.y,
        cx: (sx + tg.x) / 2 - (dym / dist) * bend,
        cy: (sy + tg.y) / 2 + (dxm / dist) * bend,
        delay: (isRule ? 0.08 : 0.02) + 0.18 * clamp(tg.x / s.W) + r() * 0.1,
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
  const srcFade = 1 - ease(pr(t, FLOW, 0.4))
  const hotU = ease(pr(t, HOT, 0.6))
  const h = s.hs

  // 배경의 아주 옅은 먼지 점
  s.dust.forEach((d) => {
    const a = 0.22 * ease(pr(t, APPEAR + d.delay, 0.8)) * lerp(1, 0.4, hotU) * srcFade
    if (a <= 0.003) return
    ctx.fillStyle = rgba(IVORY, a)
    ctx.beginPath()
    ctx.arc(d.x + Math.sin(t * 0.7 + d.ph) * 4, d.y + Math.cos(t * 0.6 + d.ph) * 4, d.r, 0, Math.PI * 2)
    ctx.fill()
  })

  if (srcFade > 0.003) {
    const P = s.learners.map((L) => learnerPos(s, L, t))

    // 점등된 모둠 둘레의 고리
    if (hotU > 0.01) {
      const c = s.centers[HOT_GROUP]
      ;[1.9, 2.25].forEach((k, i) => {
        const u = ease(pr(t, HOT + i * 0.18, 0.7))
        if (u <= 0) return
        ctx.strokeStyle = rgba(GOLD, (i ? 0.2 : 0.45) * u * srcFade)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(c[0], c[1] + h * 1.4, s.seat * k * (0.75 + 0.25 * u), 0, Math.PI * 2)
        ctx.stroke()
      })
    }

    // 말 한마디: 말한 사람 → 들은 사람으로 건너가는 작은 빛, 그리고 카드로 날아가는 기록 점
    const R = rowGeom(s)
    s.talk.forEach((e) => {
      if (e.hist) return
      const a0 = P[e.g * PER_GROUP + e.from]
      const b0 = P[e.g * PER_GROUP + e.to]
      const hot = e.g === HOT_GROUP
      const col = hot ? mix(MINT, GOLD, hotU) : MINT
      const dim = hot ? 1 : lerp(1, 0.45, hotU)
      const u = pr(t, e.t, HOP)
      if (u > 0 && u < 1) {
        // 두 사람을 잇는 옅은 선(대화가 오가는 중) + 건너가는 빛
        ctx.strokeStyle = rgba(col, 0.28 * Math.sin(u * Math.PI) * dim * srcFade)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a0[0], a0[1])
        ctx.lineTo(b0[0], b0[1])
        ctx.stroke()
        const k = ease(u)
        const lift = -Math.sin(u * Math.PI) * s.seat * 0.18
        ctx.fillStyle = rgba(col, 0.95 * Math.sin(u * Math.PI) * dim * srcFade)
        ctx.beginPath()
        ctx.arc(lerp(a0[0], b0[0], k), lerp(a0[1], b0[1], k) + lift, h * 0.72, 0, Math.PI * 2)
        ctx.fill()
      }
      const v = pr(t, e.t, SEND)
      if (v > 0 && v < 1 && t > CARD_IN) {
        const k = ease(v)
        const ty = R.C.y + rowSlot(e.g, t) * R.rowH + R.rowH / 2
        const mx = lerp(a0[0], R.inX, 0.5)
        const my = Math.min(a0[1], ty) - s.seat * 0.6
        const q = 1 - k
        const x = q * q * a0[0] + 2 * q * k * mx + k * k * R.inX
        const y = q * q * a0[1] + 2 * q * k * my + k * k * ty
        ctx.fillStyle = rgba(col, 0.55 * Math.sin(v * Math.PI) * dim * srcFade)
        ctx.beginPath()
        ctx.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // 학습자 실루엣
    s.learners.forEach((L, i) => {
      const appear = ease(pr(t, APPEAR + L.delay, 0.7))
      let col = L.tone
      let a = appear * 0.92
      if (L.g === HOT_GROUP) col = mix(L.tone, GOLD, hotU)
      else a *= lerp(1, 0.42, hotU)
      // 말하는 순간 살짝 밝아짐
      const speaking = s.talk.some((e) => !e.hist && e.g === L.g && e.from === L.k && t >= e.t - 0.05 && t < e.t + 0.18)
      person(ctx, P[i][0], P[i][1], h, speaking ? mix(col, [255, 255, 255], 0.5) : col, a * srcFade)
    })
  }

  // 점 카드 — 모둠마다 한 줄, 글자 없음
  const cardA = ease(pr(t, CARD_IN, 0.6)) * srcFade
  if (cardA > 0.003) {
    const C = s.card
    ctx.fillStyle = `rgba(255,255,255,${0.05 * cardA})`
    ctx.strokeStyle = rgba(GOLD, (0.32 + 0.48 * hotU) * cardA)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(C.x, C.y, C.w, C.h, 8)
    ctx.fill()
    ctx.stroke()
    // 줄 바탕의 옅은 점선 (기록이 쌓일 자리)
    const R = rowGeom(s)
    for (let g = 0; g < GROUPS; g++) {
      const cy = C.y + rowSlot(g, t) * R.rowH + R.rowH / 2
      ctx.fillStyle = rgba(IVORY, 0.12 * cardA)
      for (let x = R.outX; x <= R.inX + 0.5; x += 9) ctx.fillRect(x - 0.5, cy - 0.5, 1, 1)
    }
    cardDots(s, t).forEach((d) => {
      ctx.fillStyle = rgba(d.col, d.a * cardA)
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fill()
    })
    if (hotU > 0.02) {
      const slot = rowSlot(HOT_GROUP, t)
      ctx.strokeStyle = rgba(GOLD, 0.85 * hotU * cardA)
      ctx.beginPath()
      ctx.roundRect(C.x + 6, C.y + slot * R.rowH + 4, C.w - 12, R.rowH - 8, 6)
      ctx.stroke()
    }
  }

  // 글자로 흘러가는 점
  if (t >= FLOW && s.parts) {
    const rad = Math.max(1.05, s.name.step * 0.34)
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
      ctx.arc(x, y, lerp(1.6, p.rule ? rad * 0.9 : rad, u), 0, Math.PI * 2)
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
      s.parts = null
    })
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      // 글자 자리는 글꼴이 준비된 뒤, 점들이 흘러 나가기 전에 잽니다(창 크기가 바뀌면 다시).
      if (!s.name && fontsReady && t > FLOW - 1.2) {
        s.name = sampleName(s, cv.getBoundingClientRect())
        s.parts = null
      }
      if (s.name && !s.parts && t >= FLOW) makeParticles(s, t)
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
