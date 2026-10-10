import { useEffect, useRef } from 'react'

/**
 * 메인 화면 배경 — 녹색 칠판에 분필로 다섯 사람이 그려지고, 가운데 친구의 "생각"이 선을 타고
 * 양쪽으로 번져 나가며 모두가 이어지는 네트워크(협력학습 상호작용)가 되는 장면.
 *
 *  0.0s  칠판에 지워진 분필 자국이 희미하게 남아 있음
 *  0.15s~ 다섯 사람이 분필로 빠르게 그려지고, 머리 둘레에는 아직 빈 "참여 링"(옅은 바탕선)만 있음
 *  1.0s~  가운데 친구 머리 위에 분필 전구가 번뜩이며 생각이 떠오르고, 그 친구의 링부터 차오름
 *  1.3s~  생각(빛 알갱이)이 양옆 친구에게 동시에 건너감 → 도착한 친구만 링이 차오르고 머리가 빛남
 *  1.95s~ 그 친구들이 바깥쪽 친구에게 다시 건넴. 생각이 지나간 선은 보낸 사람의 색(금색·민트)으로 물듦
 *  2.55s~ 대각선 연결이 마저 그어지며 네트워크가 두 색으로 엮임
 *  2.95s~ 모두 연결된 순간: 모든 링이 동시에 꽉 차고, 네트워크가 심장처럼 한 번 "쿵" 뛰며 물결이 퍼짐
 *  3.7s~ 네트워크가 옅어지며 아래쪽 배경으로 내려앉고, 그 위 빈 공간에 랩 이름이 나타남 (HeroIntro.jsx)
 *  6.9s~ "CoRe Lab"이 완성되면 학생들이 작아지며 로고의 두 학습자 점(o 위 · R 위)으로 모여 들어가고,
 *        칠판에는 글자만 남음 (도착 지점은 HeroIntro.jsx가 그리는 로고 점의 실제 화면 위치)
 *
 * - 매 프레임 필터를 다시 계산하는 SVG 필터 대신, 한 번 만든 분필 결(노이즈) 무늬로 선을 칠해서
 *   휴대폰·카카오톡 인앱 브라우저에서도 가볍게 돌아갑니다.
 * - 애니메이션이 끝나면 프레임 계산을 멈추고, 네트워크는 CSS로 아주 천천히 떠다니기만 합니다.
 * - animated=false(동작 줄이기, 재방문)이면 처음부터 완성된(옅어진) 네트워크만 보여줍니다.
 */

const NS = 'http://www.w3.org/2000/svg'
const CHALK = '#f5f2e8'
const GOLD = '#e4d083'
const MINT = '#8fe3ea'

// 시간표(초) — HeroIntro.jsx의 단계 시각과 맞춰져 있습니다.
export const CHALK_NAME_AT = 3.7 // 이 시각에 랩 이름이 나타나기 시작
const DIM2_AT = 6.2 // "CoRe Lab" 완성 무렵, 한 번 더 옅어짐
// "CoRe Lab"이 완성된 뒤, 학생들이 로고의 두 학습자(o 위 · R 위의 점)로 모여 들어가는 구간
export const CONV_AT = 6.9
const FLY = 1.0 // 한 사람이 날아가는 데 걸리는 시간
const STAG = 0.08 // 사람마다 출발 시차
const END_AT = 10

const clamp = (x) => Math.max(0, Math.min(1, x))
const pr = (t, s, d) => clamp((t - s) / d)
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eo = (x) => 1 - Math.pow(1 - x, 3)

const LAYOUTS = {
  wide: {
    vb: [1000, 520],
    r: 31,
    sw: 3.4,
    people: [
      [140, 255],
      [320, 205],
      [500, 272],
      [680, 205],
      [860, 255],
    ],
    settle: { dy: 50, k: 1 }, // 이름이 나타날 때 네트워크가 내려앉는 정도(아래로, 크기)
  },
  tall: {
    vb: [400, 720],
    r: 27,
    sw: 3.2,
    people: [
      [108, 100],
      [292, 215],
      [108, 330],
      [292, 445],
      [108, 560],
    ],
    settle: { dy: 130, k: 0.75 },
  },
}

// ── 생각 릴레이 시간표 ──
// 가운데 친구에게서 "생각(빛)"이 떠오르면 양쪽으로 동시에 퍼져 나가고,
// 생각이 도착한 사람만 그제서야 참여 링이 차오르며 머리가 노드로 빛납니다(연결 → 채움).
// 생각이 지나간 선은 보낸 사람의 색(금색·민트)으로 물들고, 다섯 명이 모두 이어지면
// 대각선 연결이 마저 그어지며 모든 링이 동시에 꽉 차고, 네트워크가 심장처럼 한 번 "쿵" 뜁니다.
const ORIGIN = 2 // 생각이 처음 떠오르는 사람(가운데)
const ORIGIN_AT = 1.0
const HOP_D = 0.36 // 한 칸 건너가는 데 걸리는 시간
// 연결선마다 [보내는 사람, 출발 시각] (LINKS 순서: 0–1, 1–2, 2–3, 3–4, 0–2, 1–3, 2–4)
const LINK_PLAN = [
  [1, 1.95], // 1 → 0
  [2, 1.3], // 2 → 1
  [2, 1.3], // 2 → 3
  [3, 1.95], // 3 → 4
  [0, 2.55], // 대각선: 마지막에 한꺼번에
  [1, 2.61],
  [2, 2.67],
]
const ARRIVE = [1.95 + HOP_D, 1.3 + HOP_D, ORIGIN_AT, 1.3 + HOP_D, 1.95 + HOP_D] // 사람마다 생각이 도착하는 시각
const FILL_D = 0.34 // 도착 후 링이 차오르는 시간
const SOLO = 0.72 // 혼자 연결됐을 때 링이 차는 정도
const ALL_AT = 2.95 // 모두 연결 → 모든 링이 동시에 꽉 참 + "쿵"
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 2],
  [1, 3],
  [2, 4],
]

// 분필 결: 흰 가루가 고르지 않게 묻은 듯한 작은 노이즈 타일 (한 번만 만듭니다)
let grainUrl = null
function chalkGrain() {
  if (grainUrl) return grainUrl
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(96, 96)
    for (let i = 0; i < img.data.length; i += 4) {
      const r = Math.random()
      img.data[i] = 247
      img.data[i + 1] = 244
      img.data[i + 2] = 234
      img.data[i + 3] = r < 0.2 ? 30 + r * 200 : 175 + Math.random() * 80
    }
    ctx.putImageData(img, 0, 0)
    grainUrl = c.toDataURL('image/png')
  } catch {
    grainUrl = ''
  }
  return grainUrl
}

function build(svg, L) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag)
    for (const k in attrs) e.setAttribute(k, attrs[k])
    parent.appendChild(e)
    return e
  }
  const grain = chalkGrain()
  const defs = mk('defs', {}, svg)
  let paint = CHALK
  if (grain) {
    const pat = mk('pattern', { id: 'hc-grain', patternUnits: 'userSpaceOnUse', width: 96, height: 96 }, defs)
    mk('image', { href: grain, width: 96, height: 96 }, pat)
    paint = 'url(#hc-grain)'
  }
  const grad = (id, color) => {
    const g = mk('radialGradient', { id }, defs)
    mk('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0.95 }, g)
    mk('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, g)
  }
  grad('hc-glow-a', GOLD)
  grad('hc-glow-b', MINT)
  const sg = mk('radialGradient', { id: 'hc-smudge' }, defs)
  mk('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, sg)
  mk('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, sg)

  const [VW, VH] = L.vb
  const R = L.r
  const P = L.people

  // 지워진 분필 자국
  const smGroup = mk('g', {}, svg)
  const smData =
    VW > VH
      ? [
          [180, 120, 300, 70, -6],
          [720, 90, 260, 60, 8],
          [500, 430, 420, 80, 3],
          [880, 380, 180, 60, -10],
        ]
      : [
          [80, 120, 150, 60, -14],
          [280, 260, 170, 70, 10],
          [120, 520, 190, 60, 8],
          [300, 640, 120, 50, -6],
        ]
  const smudges = smData.map(([x, y, w, h, r]) =>
    mk(
      'ellipse',
      { cx: x, cy: y, rx: w / 2, ry: h / 2, fill: 'url(#hc-smudge)', opacity: 0, transform: `rotate(${r} ${x} ${y})` },
      smGroup,
    ),
  )

  const shift = mk('g', {}, svg)
  const net = mk('g', { class: 'hero-chalk-net' }, shift)
  const lines = mk('g', {}, net)
  const glow = mk('g', {}, net)

  const stroke = (e, w = L.sw) => {
    e.setAttribute('pathLength', '1')
    e.setAttribute('fill', 'none')
    e.setAttribute('stroke', paint)
    e.setAttribute('stroke-width', w)
    e.setAttribute('stroke-linecap', 'round')
    e.setAttribute('stroke-linejoin', 'round')
    e.style.strokeDasharray = '1 1'
    e.style.strokeDashoffset = '1'
    e.style.visibility = 'hidden' // 아직 그리기 전에는 아예 숨김 (둥근 끝 모양 때문에 점이 남는 것을 막음)
    return e
  }

  const figs = P.map(([x, y], i) => {
    // 사람마다 묶음(g)으로 두어, 마지막에 통째로 작아지며 로고 점으로 날아갈 수 있게 합니다.
    const fl = mk('g', {}, lines)
    const fg = mk('g', {}, glow)
    const head = stroke(mk('circle', { cx: x, cy: y, r: R, transform: `rotate(-90 ${x} ${y})` }, fl))
    const sy = y + R + 16
    const sw = R * 1.75
    const sh = R * 1.85
    const body = stroke(
      mk(
        'path',
        {
          d: `M${x - sw},${sy + sh} C${x - sw},${sy + sh * 0.35} ${x - sw * 0.55},${sy} ${x},${sy} C${x + sw * 0.55},${sy} ${x + sw},${sy + sh * 0.35} ${x + sw},${sy + sh}`,
        },
        fl,
      ),
    )
    const g = mk('circle', { cx: x, cy: y, r: R * 2.1, fill: `url(#hc-glow-${i % 2 ? 'b' : 'a'})`, opacity: 0 }, fg)
    const fill = mk('circle', { cx: x, cy: y, r: R - 3, fill: i % 2 ? MINT : GOLD, opacity: 0 }, fg)
    // 참여 링: 머리 둘레의 원호(얼마나 말했는지). 옅은 바탕 링 위에 색 링이 차오릅니다.
    const rr = R * 1.42
    const ringW = L.sw * 1.9
    const ringTrack = mk('circle', { cx: x, cy: y, r: rr, transform: `rotate(-90 ${x} ${y})`, pathLength: 1 }, fg)
    ringTrack.setAttribute('fill', 'none')
    ringTrack.setAttribute('stroke', 'rgba(245,242,232,0.22)')
    ringTrack.setAttribute('stroke-width', ringW)
    ringTrack.setAttribute('opacity', 0)
    const ring = mk('circle', { cx: x, cy: y, r: rr, transform: `rotate(-90 ${x} ${y})`, pathLength: 1 }, fg)
    ring.setAttribute('fill', 'none')
    ring.setAttribute('stroke', i % 2 ? MINT : GOLD)
    ring.setAttribute('stroke-width', ringW)
    ring.setAttribute('stroke-linecap', 'round')
    ring.setAttribute('opacity', 0)
    // 차오르는 끝에서 반짝이는 점, 다 찼을 때 퍼지는 작은 물결
    const tip = mk('circle', { cx: x, cy: y, r: ringW * 0.62, fill: 'rgba(255,251,236,0.96)', opacity: 0 }, fg)
    const ping = mk('circle', { cx: x, cy: y, r: rr, fill: 'none', stroke: i % 2 ? MINT : GOLD, 'stroke-width': ringW * 0.7, opacity: 0 }, fg)
    return { head, body, g, fill, ring, ringTrack, tip, ping, rr, fl, fg, x, y }
  })

  // 분필 전구: 생각이 처음 떠오르는 사람 머리 위에 그려지듯 나타납니다.
  const colored = (e, color, w) => {
    stroke(e, w)
    e.setAttribute('stroke', color)
    return e
  }
  const iconBulb = (x, y) => {
    const k = R / 31
    const cy = y - R * 2.7
    const w = L.sw * 0.95
    const gl = mk('circle', { cx: x, cy, r: 30 * k, fill: 'url(#hc-glow-a)', opacity: 0 }, glow)
    const parts = [
      mk('path', { d: `M${x - 11 * k},${cy + 6 * k} C${x - 22 * k},${cy - 6 * k} ${x - 16 * k},${cy - 22 * k} ${x},${cy - 22 * k} C${x + 16 * k},${cy - 22 * k} ${x + 22 * k},${cy - 6 * k} ${x + 11 * k},${cy + 6 * k} C${x + 8 * k},${cy + 10 * k} ${x + 8 * k},${cy + 13 * k} ${x + 8 * k},${cy + 16 * k} L${x - 8 * k},${cy + 16 * k} C${x - 8 * k},${cy + 13 * k} ${x - 8 * k},${cy + 10 * k} ${x - 11 * k},${cy + 6 * k}Z` }, lines),
      mk('path', { d: `M${x - 6 * k},${cy + 22 * k} L${x + 6 * k},${cy + 22 * k}` }, lines),
      mk('path', { d: `M${x - 26 * k},${cy - 14 * k} L${x - 33 * k},${cy - 18 * k}` }, lines),
      mk('path', { d: `M${x + 26 * k},${cy - 14 * k} L${x + 33 * k},${cy - 18 * k}` }, lines),
      mk('path', { d: `M${x},${cy - 30 * k} L${x},${cy - 38 * k}` }, lines),
    ].map((e) => colored(e, GOLD, w))
    return { parts, gl }
  }
  const icons = [iconBulb(P[ORIGIN][0], P[ORIGIN][1])]

  const trim = (a, b, r) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    return [a[0] + (dx / l) * r, a[1] + (dy / l) * r]
  }
  const links = LINKS.map(([i, j], k) => {
    let A = trim(P[i], P[j], R + 9)
    let B = trim(P[j], P[i], R + 9)
    let dx = B[0] - A[0]
    let dy = B[1] - A[1]
    let l = Math.hypot(dx, dy)
    let bend = (k % 2 ? 1 : -1) * l * 0.16
    let C = [(A[0] + B[0]) / 2 - (dy / l) * bend, (A[1] + B[1]) / 2 + (dx / l) * bend]
    // 세로 화면(모바일): 같은 줄의 두 사람을 곧게 이으면 선이 가운데 사람 몸을 가로지르므로,
    // 머리 바깥쪽 옆에서 출발해 화면 가장자리 쪽으로 살짝 부풀어 오르는 곡선으로 이어 줍니다.
    if (VW < VH && Math.abs(P[i][0] - P[j][0]) < 1) {
      const side = P[i][0] < VW / 2 ? -1 : 1
      const off = R + 11
      const ax = P[i][0] + side * off * 0.88
      A = [ax, P[i][1] + off * 0.48]
      B = [ax, P[j][1] - off * 0.48]
      C = [ax + side * 80, (A[1] + B[1]) / 2]
    }
    const path = stroke(mk('path', { d: `M${A[0]},${A[1]} Q${C[0]},${C[1]} ${B[0]},${B[1]}` }, lines), L.sw * 0.76)
    // 생각이 지나간 자리를 보낸 사람의 색으로 물들이는 선(분필선 위에 겹침)
    const from = LINK_PLAN[k][0]
    const tint = mk('path', { d: `M${A[0]},${A[1]} Q${C[0]},${C[1]} ${B[0]},${B[1]}`, pathLength: 1 }, lines)
    tint.setAttribute('fill', 'none')
    tint.setAttribute('stroke', from % 2 ? MINT : GOLD)
    tint.setAttribute('stroke-width', L.sw * 0.95)
    tint.setAttribute('stroke-linecap', 'round')
    tint.setAttribute('opacity', 0.82)
    tint.style.strokeDasharray = '1 1'
    const pulse = mk('circle', { r: L.sw * 1.45, fill: '#fff', opacity: 0 }, glow)
    return { path, tint, pulse, A, B, C, rev: from === j }
  })

  return { smudges, shift, net, figs, icons, links, L }
}

/**
 * 선을 p(0~1)만큼 그립니다. 그리기 전(p=0)에는 선을 숨깁니다.
 * (선 끝이 둥글어서, 숨겨 두지 않으면 시작하기 전 각 선의 시작점에 작은 점이 찍혀 보입니다)
 */
function draw(e, p) {
  e.style.strokeDashoffset = 1 - p
  e.style.visibility = p > 0.001 ? 'visible' : 'hidden'
}

function render(s, t) {
  s.smudges.forEach((e, i) =>
    e.setAttribute('opacity', (0.06 * eo(pr(t, 0.05 + i * 0.12, 0.7)) * (1 - eo(pr(t, CHALK_NAME_AT - 0.1, 0.8)))).toFixed(3)),
  )
  const R = s.L.r
  const hop = (t0, d, amp) => -amp * Math.max(0, Math.sin(pr(t, t0, d) * Math.PI))
  const ringIn = eo(pr(t, 0.5, 0.45))
  const ringFade = 1 - eo(pr(t, 3.9, 0.6))
  const all = eio(pr(t, ALL_AT, 0.32)) // 모두 연결된 순간 → 링 100%
  const allPing = pr(t, ALL_AT + 0.22, 0.6)
  s.figs.forEach((f, i) => {
    // 한 명씩 빠르게 그려집니다(왼쪽부터).
    const st = 0.15 + i * 0.08
    draw(f.head, eio(pr(t, st, 0.4)))
    draw(f.body, eio(pr(t, st + 0.15, 0.4)))
    // 생각이 도착하면: 링이 차오르고 → 머리가 빛나고 → 살짝 뛰어오름("아하!")
    const at = ARRIVE[i]
    const fp = pr(t, at, FILL_D)
    const v = SOLO * eio(fp) + (1 - SOLO) * all
    f.ring.style.strokeDasharray = `${v.toFixed(4)} 1`
    f.ring.setAttribute('opacity', (v > 0.002 ? ringFade : 0).toFixed(3))
    f.ringTrack.setAttribute('opacity', (ringIn * ringFade * 0.9).toFixed(3))
    const on = eio(pr(t, at + 0.12, 0.35))
    const flash = Math.sin(pr(t, ALL_AT, 0.7) * Math.PI)
    f.g.setAttribute('opacity', Math.min(1, on * 0.5 + flash * 0.35).toFixed(3))
    f.fill.setAttribute('opacity', (on * 0.92).toFixed(3))
    // 차오르는 끝점의 반짝임
    const filling = fp > 0 && fp < 1 ? fp : all > 0 && all < 1 ? all : -1
    const ang = -Math.PI / 2 + v * Math.PI * 2
    f.tip.setAttribute('cx', (f.x + f.rr * Math.cos(ang)).toFixed(2))
    f.tip.setAttribute('cy', (f.y + f.rr * Math.sin(ang)).toFixed(2))
    f.tip.setAttribute('opacity', (filling >= 0 ? Math.min(1, Math.sin(filling * Math.PI) * 2.2) * ringFade : 0).toFixed(3))
    // 물결: 혼자 채워졌을 때 작게, 모두 연결됐을 때 다 같이 크게
    const q1 = pr(t, at + FILL_D, 0.45)
    const solo = q1 > 0 && q1 < 1 ? { k: 1 + 0.4 * eo(q1), o: 0.5 * (1 - q1) } : null
    const big = allPing > 0 && allPing < 1 ? { k: 1 + 0.85 * eo(allPing), o: 0.7 * (1 - allPing) } : null
    const pg = big || solo
    f.ping.setAttribute('r', (f.rr * (pg ? pg.k : 1)).toFixed(2))
    f.ping.setAttribute('opacity', (pg ? pg.o * ringFade : 0).toFixed(3))
    const b = i === ORIGIN ? hop(ORIGIN_AT + 0.05, 0.42, R * 0.13) : hop(at - 0.03, 0.42, R * 0.14)
    const tr = b ? `translate(0 ${b.toFixed(2)})` : ''
    f.fl.setAttribute('transform', tr)
    f.fg.setAttribute('transform', tr)
  })
  // 가운데 친구 머리 위 전구: 생각이 "번뜩" 떠오름 → 그 생각이 양쪽 선을 타고 출발
  s.icons.forEach((ic) => {
    const d = eio(pr(t, ORIGIN_AT - 0.12, 0.32))
    const out = 1 - eo(pr(t, 1.75, 0.35))
    ic.parts.forEach((e) => {
      draw(e, d)
      e.style.opacity = out
    })
    if (ic.gl) {
      const flick = 0.55 + 0.45 * Math.sin((t - ORIGIN_AT) * 16) * (1 - pr(t, ORIGIN_AT + 0.2, 0.4))
      ic.gl.setAttribute('opacity', (d > 0.6 ? 0.85 * out * flick : 0).toFixed(3))
    }
  })
  // 연결선: 빛 알갱이가 보낸 사람 쪽에서 선을 "그리며" 건너가고, 지나간 자리는 보낸 사람 색으로 물듦
  s.links.forEach((l, k) => {
    const start = LINK_PLAN[k][1]
    const cross = k >= 4
    const pp = pr(t, start, cross ? 0.3 : HOP_D)
    const u = eio(pp)
    const drawDir = (e, p) => {
      e.style.strokeDashoffset = l.rev ? -(1 - p) : 1 - p
      e.style.visibility = p > 0.001 ? 'visible' : 'hidden'
    }
    drawDir(l.path, u)
    drawDir(l.tint, eio(pr(t, start + 0.04, cross ? 0.3 : HOP_D)))
    if (pp > 0 && pp < 1) {
      const w = l.rev ? 1 - u : u
      const a = (1 - w) * (1 - w)
      const b = 2 * (1 - w) * w
      const c = w * w
      l.pulse.setAttribute('cx', a * l.A[0] + b * l.C[0] + c * l.B[0])
      l.pulse.setAttribute('cy', a * l.A[1] + b * l.C[1] + c * l.B[1])
      l.pulse.setAttribute('opacity', (cross ? 0.8 : 1).toFixed(3))
    } else {
      l.pulse.setAttribute('opacity', 0)
    }
  })
  let dim = 1 - 0.68 * eo(pr(t, CHALK_NAME_AT, 0.9)) - 0.14 * eo(pr(t, DIM2_AT, 1))
  if (t >= CONV_AT) dim = converge(s, t, dim)
  s.shift.setAttribute('opacity', Math.max(0, dim).toFixed(3))
  // 이름이 놓일 자리를 비워 주려고, 네트워크가 아래쪽으로 부드럽게 내려앉습니다.
  const u = eio(pr(t, CHALK_NAME_AT - 0.35, 1.1))
  const [VW, VH] = s.L.vb
  const { dy, k } = s.L.settle
  // 모두 연결된 순간 네트워크가 심장처럼 한 번 "쿵" (1.03배로 커졌다가 돌아옴)
  const beat = 1 + 0.03 * Math.sin(pr(t, ALL_AT + 0.05, 0.42) * Math.PI)
  const kk = (1 + (k - 1) * u) * beat
  s.shift.setAttribute('transform', `translate(${VW / 2} ${VH / 2 + dy * u}) scale(${kk}) translate(${-VW / 2} ${-VH / 2})`)
}

/**
 * 로고로 모이기: 연결선·말풍선은 사라지고, 사람들이 작아지며 곡선을 그리고 날아가
 * (1·3·5번째 → o 위 점, 2·4번째 → R 위 점) 로고의 두 학습자 점 크기로 수렴합니다.
 * 도착 지점은 HeroIntro.jsx가 로고 점 자리에 놓아둔 표식(data-hero-dot)의 실제 화면 위치를 읽어
 * 칠판 좌표로 바꿔 씁니다. (표식이 아직 없으면 그냥 옅어지기만 합니다)
 */
function converge(s, t, dim0) {
  const svg = s.shift.ownerSVGElement
  let dim = dim0 + (0.95 - dim0) * eo(pr(t, CONV_AT - 0.15, 0.45))
  const linesOut = 1 - eo(pr(t, CONV_AT - 0.05, 0.45))
  s.icons.forEach((ic) => {
    ic.parts.forEach((e) => (e.style.opacity = 0))
    if (ic.gl) ic.gl.setAttribute('opacity', 0)
  })
  s.figs.forEach((f) => {
    f.ring.setAttribute('opacity', 0)
    f.ringTrack.setAttribute('opacity', 0)
    f.tip.setAttribute('opacity', 0)
    f.ping.setAttribute('opacity', 0)
  })
  s.links.forEach((l) => {
    l.path.style.opacity = linesOut
    l.tint.style.opacity = linesOut
    l.pulse.setAttribute('opacity', 0)
  })
  if (!s.targets) {
    const dots = ['a', 'b'].map((k) => {
      const el = document.querySelector(`[data-hero-dot="${k}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }
    })
    if (dots[0] && dots[1]) s.targets = dots
  }
  if (s.targets) {
    const ctm = s.net.getScreenCTM()
    const inv = ctm.inverse()
    const toLocal = (x, y) => {
      const p = svg.createSVGPoint()
      p.x = x
      p.y = y
      return p.matrixTransform(inv)
    }
    const scaleNow = Math.hypot(ctm.a, ctm.b)
    s.figs.forEach((f, i) => {
      const tgt = s.targets[i % 2]
      const T = toLocal(tgt.x, tgt.y)
      const rEnd = tgt.r / scaleNow / s.L.r
      const u = eio(pr(t, CONV_AT + i * STAG, FLY))
      // 위로 살짝 휘어 올라가는 곡선 경로
      const dx = T.x - f.x
      const dy = T.y - f.y
      const l = Math.hypot(dx, dy) || 1
      const bend = (i % 2 ? -1 : 1) * l * 0.22
      const cx = (f.x + T.x) / 2 - (dy / l) * bend
      const cy = (f.y + T.y) / 2 + (dx / l) * bend
      const a = (1 - u) * (1 - u)
      const b = 2 * (1 - u) * u
      const c = u * u
      const px = a * f.x + b * cx + c * T.x
      const py = a * f.y + b * cy + c * T.y
      const k = 1 + (rEnd - 1) * u
      const tr = `translate(${px} ${py}) scale(${k}) translate(${-f.x} ${-f.y})`
      f.fl.setAttribute('transform', tr)
      f.fg.setAttribute('transform', tr)
      // 몸통 선은 날아가는 동안 옅어지고, 도착하면 머리(빛)도 점 안으로 사라집니다.
      f.body.style.opacity = 1 - eo(pr(t, CONV_AT + i * STAG + 0.15, FLY * 0.6))
      f.head.style.opacity = 1 - eo(pr(t, CONV_AT + i * STAG + FLY * 0.5, FLY * 0.5))
      const gone = 1 - eo(pr(t, CONV_AT + i * STAG + FLY - 0.12, 0.16))
      f.g.setAttribute('opacity', (0.55 * gone * (1 - 0.6 * u)).toFixed(3))
      f.fill.setAttribute('opacity', (0.92 * gone).toFixed(3))
      // 금색 학습자는 o 위의 아이보리 점으로 들어가며 색이 서서히 바뀝니다.
      if (i % 2 === 0) {
        const m = (x, y) => Math.round(x + (y - x) * u)
        f.fill.setAttribute('fill', `rgb(${m(228, 245)},${m(208, 242)},${m(131, 232)})`)
      }
    })
  }
  return dim * (1 - eo(pr(t, CONV_AT + FLY + 0.5, 0.4)))
}

export default function HeroChalk({ animated }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const host = svg.parentElement
    const t0 = performance.now()
    let layoutKey = null
    let scene = null
    let raf = 0
    let done = !animated

    const now = () => (done ? END_AT : (performance.now() - t0) / 1000)

    // 칠판(hero) 크기에 맞춰 장면을 가운데 놓고, 세로로 긴 화면에서는 세로 배치를 씁니다.
    const layout = () => {
      const W = host.clientWidth || window.innerWidth
      const H = host.clientHeight || window.innerHeight
      const key = W / H < 0.85 ? 'tall' : 'wide'
      const L = LAYOUTS[key]
      if (key !== layoutKey) {
        layoutKey = key
        scene = build(svg, L)
        render(scene, now())
      }
      const [VW, VH] = L.vb
      // 가장자리(전구·물결)가 잘리지 않도록 살짝 여백을 둡니다.
      const s = Math.min(W / (VW * 1.06), H / (VH * 1.06))
      const vw = W / s
      const vh = H / s
      svg.setAttribute('viewBox', `${(VW - vw) / 2} ${(VH - vh) / 2} ${vw} ${vh}`)
    }
    layout()

    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(layout)
      ro.observe(host)
    } else {
      window.addEventListener('resize', layout)
    }

    const tick = () => {
      const t = now()
      render(scene, t)
      if (t >= CHALK_NAME_AT) svg.classList.add('hero-chalk-settled')
      if (t < END_AT) raf = requestAnimationFrame(tick)
      else done = true
    }
    if (animated) raf = requestAnimationFrame(tick)
    else svg.classList.add('hero-chalk-settled')

    return () => {
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', layout)
    }
  }, [animated])

  return <svg ref={svgRef} className="hero-chalk" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" />
}
