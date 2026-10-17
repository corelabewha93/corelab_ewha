import { useEffect, useRef } from 'react'
import '../styles/hero-trace.css'

/**
 * 메인 인트로 — "I"에서 "We"로, 함께 고쳐 쓰는 한 문장 (약 6.5초)
 *
 *  0.3–1.75s  문장이 한 줄씩 써짐: "… Learn" → "Seeing How"  (가운데에는 "I")
 *  1.75–3.0s  금빛 손이 "I"를 가리킴
 *  2.4–4.0s   하늘빛 손이 연필 뒤쪽 지우개로 "I"를 지움 (지우개 가루)
 *  3.6–4.9s   장밋빛 손이 연필로 "We"를 씀
 *  4.7–5.25s  "Together"가 이어짐
 *  5.3–6.4s   문장이 흰색으로 모이며 모토 자리로 내려앉음 → 그 위로 CoRe Lab이 솟아오름(CSS)
 *  6.4s       캔버스의 문장 = 실제 모토(.hero-motto)가 같은 자리에서 이어받음. 캔버스는 지우고 멈춤
 *
 * 손은 "학습자"입니다. 통통한 어린아이 손을 흰 선으로만 그리고, 소매 끝 띠만 학습자 색(금 · 하늘 · 장밋빛)으로 칠합니다.
 * 문장은 화면에 실제로 그려진 모토(.hero-motto)의 글꼴 · 크기 · 줄바꿈을 그대로 읽어 씁니다
 * (관리자가 모토를 바꿔도 "We"가 들어 있으면 같은 연출, 없으면 손 없이 문장만 써서 내려앉습니다).
 * 클릭 건너뛰기 · 재방문 · 동작 줄이기는 HeroIntro.jsx가 처리합니다(이 경우 캔버스는 그리지 않음).
 */

const END = 6.6
// 바깥(HeroIntro · hero-trace.css)과 맞춘 시각(초)
export const TRACE_RULE = 5.9 // 이름 아래 흰 가로선이 나타나는 때
export const GATHER_AT = 0 // 캔버스 시계가 시작되는 순간 = HeroIntro의 "시작" 신호
const SWAP = 6.4 // 캔버스 문장 → 실제 모토로 바뀌는 때

const COL = {
  A: [233, 196, 106], // 금
  B: [120, 196, 214], // 하늘
  C: [228, 164, 170], // 장밋빛(배꽃)
}

const T = {
  learn: [0.3, 0.9],
  sh: [1.0, 1.75],
  point: [1.75, 3.0],
  eraser: [2.4, 4.0],
  rub: [2.8, 3.8],
  pencil: [3.6, 4.9],
  write: [3.95, 4.6],
  tog: [4.7, 5.25],
  white: [5.3, 5.7],
  move: [5.6, 6.4],
}

const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => (1 - Math.cos(Math.PI * clamp(x))) / 2
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3)
const pr = (t, a, b) => clamp((t - a) / (b - a))
const smooth = (t, a, b) => ease(pr(t, a, b))
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`
const mixW = (c, w) => [c[0] + (255 - c[0]) * w, c[1] + (255 - c[1]) * w, c[2] + (255 - c[2]) * w]

// ───────────────────────── 손 (흰 선 드로잉) ─────────────────────────
// 모든 손의 "닿는 점"이 (0,0). 연필은 +x 방향. Catmull-Rom 곡선으로 한 호흡의 윤곽을 만듭니다.
function crPts(pts, n = 10, closed = false) {
  const out = []
  const m = pts.length
  const g = (i) => (closed ? pts[((i % m) + m) % m] : pts[Math.max(0, Math.min(m - 1, i))])
  const segs = closed ? m : m - 1
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1)
    const p1 = g(i)
    const p2 = g(i + 1)
    const p3 = g(i + 2)
    for (let k = 0; k < n; k++) {
      const u = k / n
      const u2 = u * u
      const u3 = u2 * u
      const f = (a) =>
        0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * u + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * u2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * u3)
      out.push([f(0), f(1)])
    }
  }
  if (!closed) out.push(pts[m - 1])
  return out
}
function pathFrom(pts, closed = true) {
  const P = new Path2D()
  pts.forEach((q, i) => (i ? P.lineTo(q[0], q[1]) : P.moveTo(q[0], q[1])))
  if (closed) P.closePath()
  return P
}
// 끝으로 갈수록 가늘어지는 손가락
function finger(spine, w0, w1) {
  const sp = crPts(spine, 12, false)
  const n = sp.length
  const L = []
  const R = []
  for (let i = 0; i < n; i++) {
    const a = sp[Math.max(0, i - 1)]
    const b = sp[Math.min(n - 1, i + 1)]
    let dx = b[0] - a[0]
    let dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    dx /= l
    dy /= l
    const wd = (w0 + (w1 - w0) * (i / (n - 1))) / 2
    L.push([sp[i][0] - dy * wd, sp[i][1] + dx * wd])
    R.push([sp[i][0] + dy * wd, sp[i][1] - dx * wd])
  }
  const P = new Path2D()
  L.forEach((q, i) => (i ? P.lineTo(q[0], q[1]) : P.moveTo(q[0], q[1])))
  const e = sp[n - 1]
  const pe = sp[n - 2]
  const ang = Math.atan2(e[1] - pe[1], e[0] - pe[0])
  P.arc(e[0], e[1], w1 / 2, ang - Math.PI / 2, ang + Math.PI / 2)
  for (let i = n - 1; i >= 0; i--) P.lineTo(R[i][0], R[i][1])
  const s0 = sp[0]
  const s1 = sp[1]
  const a0 = Math.atan2(s1[1] - s0[1], s1[0] - s0[0])
  P.arc(s0[0], s0[1], w0 / 2, a0 + Math.PI / 2, a0 + Math.PI * 1.5)
  P.closePath()
  return P
}

// ---- 어린아이 손: 마디 없이 매끈한 한 덩어리(손가락 · 엄지가 손등과 이어진 하나의 윤곽) ----
// 쓰는 손(연필끝 = 원점, 연필은 +x)
const WRITE = {
  arm: { a: [[206, -16], [290, -46]], b: [[206, 24], [290, 42]], cuff: [206, -20, 206, 28] },
  all: [
    { k: 'blob', p: [[116, -26], [146, -34], [178, -28], [204, -14], [208, 6], [198, 24], [172, 34], [142, 36], [116, 30], [104, 16], [100, 4], [104, -12]] },
    { k: 'f', p: [[132, -20], [106, -27], [80, -23], [60, -14], [46, -6]], w: [24, 15] }, // 검지
    { k: 'f', p: [[150, 22], [122, 24], [94, 17], [72, 9], [56, 4]], w: [26, 16] }, // 엄지
  ],
  detail: [[[112, 8], [122, 16], [138, 19]], [[110, 22], [122, 28], [140, 30]]],
}
// 가리키는 손(검지 끝 = 원점, 손목은 +x)
const POINT = {
  arm: { a: [[150, 0], [230, -28]], b: [[148, 44], [228, 64]], cuff: [150, -4, 148, 48] },
  all: [
    { k: 'blob', p: [[74, -10], [106, -18], [136, -14], [152, 4], [150, 34], [130, 50], [100, 54], [78, 46], [66, 28], [68, 6]] },
    { k: 'f', p: [[96, 4], [64, 3], [32, 0], [0, 0]], w: [24, 17] }, // 검지
    { k: 'f', p: [[96, -6], [84, -22], [78, -32]], w: [22, 16] }, // 엄지
  ],
  detail: [[[72, 22], [84, 26], [98, 26]], [[72, 36], [84, 40], [98, 40]]],
}
let HANDS = null
function buildHands() {
  const bake = (list) =>
    list.map((p) => {
      if (p.k === 'blob') return pathFrom(crPts(p.p, 10, true))
      if (p.k === 'el') {
        const P = new Path2D()
        P.ellipse(p.e[0], p.e[1], p.e[2], p.e[3], p.e[4], 0, Math.PI * 2)
        return P
      }
      return finger(p.p, p.w[0], p.w[1])
    })
  const prep = (h) => ({ arm: h.arm, all: bake(h.all), detail: h.detail.map((d) => pathFrom(crPts(d, 10, false), false)) })
  const body = new Path2D()
  body.rect(12, -4.5, 112, 9)
  const cap = new Path2D()
  cap.roundRect(0, -4.5, 11, 9, 3)
  const wood = new Path2D()
  wood.moveTo(0, 0)
  wood.lineTo(12, -4.5)
  wood.lineTo(12, 4.5)
  wood.closePath()
  const lead = new Path2D()
  lead.moveTo(0, 0)
  lead.lineTo(3.6, -1.3)
  lead.lineTo(3.6, 1.3)
  lead.closePath()
  HANDS = { write: prep(WRITE), point: prep(POINT), pencil: { body, cap, wood, lead } }
}

function eraseFill(ctx, P) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  ctx.fill(P)
  ctx.restore()
}

/** 조각들의 "합친 윤곽": 굵은 선으로 모두 긋고 안쪽을 지워, 겹친 자리의 마디 선 없이 바깥 윤곽만 남깁니다(안쪽 = 손 아래 글자도 가려짐). */
function unionOutline(ctx, paths) {
  if (!paths.length) return
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  paths.forEach((P) => ctx.stroke(P))
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  paths.forEach((P) => ctx.fill(P))
  ctx.restore()
}

/** 손 하나를 "완전히 또렷하게" 그립니다. kind: 'point' | 'eraser' | 'pencil' */
function paintHand(ctx, kind, x, y, sc, rot, col, flipY) {
  if (!HANDS) buildHands()
  const H = kind === 'point' ? HANDS.point : HANDS.write
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(sc, flipY ? -sc : sc)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  // 팔: 소매 끝 띠(학습자 색) + 옅어지는 두 줄
  ;[H.arm.a, H.arm.b].forEach((e) => {
    const g = ctx.createLinearGradient(e[0][0], e[0][1], e[1][0], e[1][1])
    g.addColorStop(0, 'rgba(255,255,255,0.8)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(e[0][0], e[0][1])
    ctx.lineTo(e[1][0], e[1][1])
    ctx.stroke()
  })
  ctx.strokeStyle = rgba(col, 0.95)
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(H.arm.cuff[0], H.arm.cuff[1])
  ctx.lineTo(H.arm.cuff[2], H.arm.cuff[3])
  ctx.stroke()
  if (kind !== 'point') {
    const pc = HANDS.pencil
    ctx.lineWidth = 1.3
    ctx.strokeStyle = rgba(col, 0.95)
    eraseFill(ctx, pc.body)
    ctx.stroke(pc.body)
    if (kind === 'eraser') {
      eraseFill(ctx, pc.cap)
      ctx.stroke(pc.cap)
    } else {
      eraseFill(ctx, pc.wood)
      ctx.stroke(pc.wood)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill(pc.lead)
    }
  }
  unionOutline(ctx, H.all)
  ctx.lineWidth = 1.1
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  H.detail.forEach((P) => ctx.stroke(P))
  ctx.restore()
}

/** 손이 놓인 자리의 글자를 가립니다(alpha만큼). */
function eraseUnder(ctx, kind, x, y, sc, rot, flipY, alpha) {
  const H = kind === 'point' ? HANDS.point : HANDS.write
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(sc, flipY ? -sc : sc)
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  H.all.forEach((P) => ctx.fill(P))
  if (kind !== 'point') {
    ctx.fill(HANDS.pencil.body)
    ctx.fill(kind === 'eraser' ? HANDS.pencil.cap : HANDS.pencil.wood)
  }
  ctx.restore()
}

/**
 * 손을 그립니다. 나타나거나 사라지는 중(alpha < 1)에는 따로 그린 그림을 투명도로 얹어,
 * 윤곽이 겹쳐 비치는 일(마디처럼 보임) 없이 부드럽게 나타나고 사라지게 합니다.
 */
function drawHand(ctx, s, kind, x, y, sc, rot, col, flipY, alpha) {
  if (alpha <= 0.003) return
  if (!HANDS) buildHands()
  if (alpha >= 0.999 || !s.off) {
    paintHand(ctx, kind, x, y, sc, rot, col, flipY)
    return
  }
  eraseUnder(ctx, kind, x, y, sc, rot, flipY, alpha)
  s.off.clearRect(0, 0, s.W, s.H)
  paintHand(s.off, kind, x, y, sc, rot, col, flipY)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(s.offCv, 0, 0)
  ctx.restore()
}

// ───────────────────────── 화면 읽기 · 문장 배치 ─────────────────────────
/** transform(등장 효과의 이동)을 빼고 요소의 원래 자리를 돌려줍니다. */
function restRect(el, cvRect) {
  const r = el.getBoundingClientRect()
  let ty = 0
  let tx = 0
  const tf = getComputedStyle(el).transform
  if (tf && tf !== 'none') {
    const m = new DOMMatrixReadOnly(tf)
    tx = m.e
    ty = m.f
  }
  return { left: r.left - cvRect.left - tx, top: r.top - cvRect.top - ty, width: r.width, height: r.height }
}

/** 모토 속 단어들이 화면에서 몇 번째 줄에 놓이는지(모바일의 두 줄 모토 포함)를 읽습니다. */
function readWords(el, dy) {
  const words = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const re = /\S+/g
    let m = re.exec(node.data)
    while (m) {
      const rg = document.createRange()
      rg.setStart(node, m.index)
      rg.setEnd(node, m.index + m[0].length)
      const rc = rg.getClientRects()[0]
      words.push({ w: m[0], top: (rc ? rc.top : 0) - dy })
      m = re.exec(node.data)
    }
    node = walker.nextNode()
  }
  const tops = []
  words.forEach((w) => {
    if (!tops.some((t) => Math.abs(t - w.top) < 4)) tops.push(w.top)
  })
  tops.sort((a, b) => a - b)
  words.forEach((w) => {
    w.line = tops.findIndex((t) => Math.abs(t - w.top) < 4)
  })
  return words
}

/** 화면 크기 · 글꼴이 정해진 뒤 한 번(창 크기가 바뀌면 다시) 장면의 자리를 잽니다. */
function layout(ctx, s, host, cv) {
  const cvRect = cv.getBoundingClientRect()
  const mottoEl = host.querySelector('.hero-motto')
  const nameEl = host.querySelector('.hero-name')
  if (!mottoEl || !nameEl) return false
  const cs = getComputedStyle(mottoEl)
  const fs = parseFloat(cs.fontSize) || 56
  s.fs = fs
  s.font = `italic 500 ${fs}px "EB Garamond", "Iowan Old Style", "Palatino Linotype", Georgia, serif`
  s.ls = parseFloat(cs.letterSpacing) || 0
  ctx.font = s.font
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${s.ls}px`
  const mt = ctx.measureText('Hg')
  const asc = mt.fontBoundingBoxAscent || fs * 0.95
  const desc = mt.fontBoundingBoxDescent || fs * 0.3
  const lhRaw = parseFloat(cs.lineHeight)
  const LH = Number.isFinite(lhRaw) ? lhRaw : asc + desc
  s.LH = LH

  const mr = restRect(mottoEl, cvRect)
  // 화면에 그려진 모토 줄의 위치(등장 효과의 이동분은 뺌). 줄 안 글자 영역의 위쪽 = 이 값, 기준선 = 이 값 + 글꼴 ascent
  const dy = mottoEl.getBoundingClientRect().top - mr.top
  const words = readWords(mottoEl, dy)
  const lines = []
  words.forEach((w) => {
    ;(lines[w.line] = lines[w.line] || []).push(w)
  })
  const weIdx = words.findIndex((w) => w.w === 'We')
  s.hasWe = weIdx >= 0
  const roles = words.map((w, i) => {
    if (!s.hasWe) return { ...w, grp: 'tog', gi: i }
    if (i < weIdx) return { ...w, grp: 'sh', gi: i }
    if (i === weIdx) return { ...w, grp: 'we', gi: 0 }
    if (i === weIdx + 1) return { ...w, grp: 'learn', gi: 0 }
    return { ...w, grp: 'tog', gi: i - weIdx - 2 }
  })
  s.lines = lines.map((_, li) => roles.filter((w) => w.line === li))
  s.nLines = s.lines.length
  s.groups = {}
  roles.forEach((r) => {
    ;(s.groups[r.grp] = s.groups[r.grp] || []).push(r)
  })

  const nr = restRect(nameEl, cvRect)
  const lineTops = lines.map((ln) => Math.min(...ln.map((w) => w.top)))
  const pitch = lineTops.length > 1 ? lineTops[1] - lineTops[0] : LH
  s.endBase = (i) => lineTops[i] + asc
  const y0 = nr.top + nr.height * 0.62
  s.startBase = (i) => y0 + (i - (s.nLines - 1) / 2) * pitch
  s.cx = mr.left + mr.width / 2
  s.sc = (0.85 * fs) / 58
  return true
}

/** 단어 묶음(grp)에 타이핑 진행을 나눠 줍니다: 단어별로 지금 보이는 글자 수(소수 = 마지막 글자가 나타나는 중) */
function typedCount(group, p) {
  const total = group.reduce((a, w) => a + w.w.length + 1, 0) - 1
  let left = p * total
  return group.map((w) => {
    const n = Math.max(0, Math.min(w.w.length, left))
    left -= w.w.length + 1
    return n
  })
}

function draw(ctx, s, t) {
  const { W, H, fs } = s
  ctx.clearRect(0, 0, W, H)
  ctx.font = s.font
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${s.ls}px`
  ctx.textBaseline = 'alphabetic'
  const G = s.groups
  const white = smooth(t, T.white[0], T.white[1])
  const move = smooth(t, T.move[0], T.move[1])
  const hands = s.hasWe

  const wI = ctx.measureText('I').width
  const wWe = ctx.measureText('We').width
  const spW = ctx.measureText(' ').width
  const iVis = pr(t, T.learn[0], T.learn[0] + 0.15)
  const erased = smooth(t, T.rub[0], T.rub[1])
  const we = pr(t, T.write[0], T.write[1])

  // 묶음별 타이핑 진행
  const prog = {
    sh: pr(t, ...T.sh),
    learn: pr(t, ...T.learn),
    tog: pr(t, ...T.tog),
  }
  if (!s.hasWe) prog.tog = pr(t, T.learn[0], T.sh[1])
  const cnt = {}
  Object.keys(G).forEach((g) => {
    if (g === 'we') return
    cnt[g] = typedCount(G[g], prog[g] ?? 0)
  })

  const colOf = (grp) => (grp === 'sh' ? COL.B : grp === 'we' ? COL.C : s.hasWe ? COL.A : COL.B)
  const shown = (r) => {
    if (r.grp === 'we') return null
    const n = cnt[r.grp][r.gi]
    if (n <= 0) return null
    const f = Math.floor(n)
    const txt = r.w.slice(0, f)
    const part = f < r.w.length ? r.w[f] : ''
    const frac = n - f
    const w = ctx.measureText(txt).width + (part ? ctx.measureText(part).width * frac : 0)
    return { txt, part, frac, w }
  }

  const pos = {} // 손이 따라갈 자리
  s.lines.forEach((line, li) => {
    // 모든 단어의 자리는 "완성된 문장" 기준으로 처음부터 고정입니다.
    // 그래서 "I Learn"이 먼저 최종 자리에 나타나고, 나중에 나오는 글자 · "We"가 들어와도 다른 글자는 움직이지 않습니다.
    const items = line.map((r) => {
      if (r.grp === 'we') return { r, w: wWe, we: true }
      return { r, sh: shown(r), w: ctx.measureText(r.w).width }
    })
    let total = 0
    items.forEach((it, i) => {
      it.gap = i > 0 ? spW : 0
      total += it.gap + it.w
    })
    const y = s.startBase(li) + (s.endBase(li) - s.startBase(li)) * move
    let x = s.cx - total / 2
    items.forEach((it) => {
      x += it.gap
      const c = mixW(colOf(it.r.grp), white)
      const finalA = 0.9 // 실제 모토의 투명도(rgba(255,255,255,.9))와 맞춤
      const a = 1 - (1 - finalA) * white
      if (it.we) {
        // "I"는 "We" 자리의 오른쪽 끝에 붙여 두어, 처음에는 "I Learn"이 자연스럽게 읽히고 "We"가 들어올 왼쪽 자리는 비워 둡니다.
        const xWe = x
        const xI = x + (wWe - wI)
        if (erased < 1) {
          ctx.fillStyle = rgba(mixW(COL.A, white), (1 - erased) * iVis)
          ctx.fillText('I', xI, y)
        }
        if (we > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(xWe - 2, y - fs, wWe * we + 2, fs * 1.4)
          ctx.clip()
          ctx.fillStyle = rgba(mixW(COL.C, white), a)
          ctx.fillText('We', xWe, y)
          ctx.restore()
        }
        pos.xI = xI
        pos.xWe = xWe
        pos.y = y
      } else if (it.sh) {
        ctx.fillStyle = rgba(c, a)
        ctx.fillText(it.sh.txt, x, y)
        if (it.sh.part && it.sh.frac > 0) {
          ctx.fillStyle = rgba(c, a * it.sh.frac)
          ctx.fillText(it.sh.part, x + ctx.measureText(it.sh.txt).width, y)
        }
      }
      x += it.w
    })
  })

  if (!hands || pos.y === undefined) return
  const { xI, xWe, y } = pos
  const sc = s.sc
  const inOut = (a, b, e = 0.35) => Math.min(easeOut(pr(t, a, a + e)), 1 - ease(pr(t, b - e, b)))

  // 지우개 가루
  if (t > T.rub[0] && t < T.rub[1] + 0.7) {
    for (let i = 0; i < 12; i++) {
      const st = T.rub[0] + i * 0.08
      const u = pr(t, st, st + 0.6)
      if (u <= 0 || u >= 1) continue
      const px = xI + wI / 2 + (((i * 37) % 17) - 8) * 1.2 + u * (i % 2 ? 1 : -1) * 10
      const py = y + 4 + u * u * 34
      ctx.fillStyle = `rgba(250,246,236,${0.75 * (1 - u)})`
      ctx.beginPath()
      ctx.arc(px, py, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 1) 금빛 손이 "I"를 가리킴
  {
    const k = inOut(...T.point)
    const tap = Math.sin(Math.PI * pr(t, 2.2, 2.6)) * 4
    drawHand(ctx, s, 'point', xI + wI * 0.1 - tap * 0.5 - (1 - k) * 60 * sc, y + fs * 0.12 + tap * 0.5 + (1 - k) * 60 * sc, sc, Math.PI * 0.74, COL.A, true, k)
  }
  // 2) 하늘빛 손이 지우개로 "I"를 지움
  {
    const k = inOut(...T.eraser)
    const rub = t > T.rub[0] && t < T.rub[1] ? Math.sin((t - T.rub[0]) * 30) * 6 * sc : 0
    drawHand(ctx, s, 'eraser', xI + wI / 2 + rub + (1 - k) * 70 * sc, y - fs * 0.3 + (1 - k) * 70 * sc, sc * 0.92, Math.PI * 0.34, COL.B, true, k)
  }
  // 3) 장밋빛 손이 연필로 "We"를 씀
  {
    const k = inOut(...T.pencil)
    const bob = t > T.write[0] && t < T.write[1] ? Math.sin((t - T.write[0]) * 26) * 2.6 * sc : 0
    const tipX = xWe + wWe * we
    drawHand(ctx, s, 'pencil', tipX + (1 - k) * 70 * sc, y - fs * 0.22 + bob - (1 - k) * 70 * sc, sc * 0.92, -0.72, COL.C, false, k)
  }
}

export default function HeroTrace({ animated, skipped = false, onGo }) {
  const ref = useRef(null)
  const goRef = useRef(onGo)
  useEffect(() => {
    goRef.current = onGo
  })
  useEffect(() => {
    const cv = ref.current
    if (!cv || !animated || skipped) {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height)
      return undefined
    }
    const ctx = cv.getContext('2d')
    const host = cv.parentElement
    const s = { W: 0, H: 0 }
    let ok = false
    let raf = 0
    let cancelled = false
    const size = () => {
      s.W = host.clientWidth || window.innerWidth
      s.H = host.clientHeight || window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(s.W * dpr)
      cv.height = Math.round(s.H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      s.offCv = s.offCv || document.createElement('canvas')
      s.offCv.width = cv.width
      s.offCv.height = cv.height
      s.off = s.offCv.getContext('2d')
      s.off.setTransform(dpr, 0, 0, dpr, 0, 0)
      ok = layout(ctx, s, host, cv)
    }
    const onResize = () => size()
    let t0 = 0
    let went = false
    const tick = () => {
      if (cancelled) return
      const t = (performance.now() - t0) / 1000
      if (!went) {
        went = true
        goRef.current?.()
      }
      if (ok && t < SWAP + 0.1) draw(ctx, s, t)
      else ctx.clearRect(0, 0, s.W, s.H)
      if (t < END) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, s.W, s.H)
    }
    // 모토 글꼴이 준비된 뒤에 시계를 시작합니다(늦어도 1.2초). 그래야 문장 폭 · 자리가 정확합니다.
    const fontReady = Promise.race([
      document.fonts?.load?.('italic 500 40px "EB Garamond"') ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 1200)),
    ])
    fontReady.then(() => {
      if (cancelled) return
      size()
      t0 = performance.now()
      raf = requestAnimationFrame(tick)
    })
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [animated, skipped])
  return <canvas ref={ref} className="hero-chalk hero-trace-canvas" aria-hidden="true" />
}
