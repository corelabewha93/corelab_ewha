import { useEffect, useRef } from 'react'

/**
 * 메인 화면 배경 — 녹색 칠판에 분필로 사람들이 그려지고, 말풍선으로 대화하다가
 * 서로 선으로 이어져 빛나는 네트워크(협력학습 상호작용)로 바뀌는 장면.
 *
 *  0.0s  칠판에 지워진 분필 자국이 희미하게 남아 있음
 *  0.5s~ 다섯 사람이 두 무리로 나뉘어(3명 → 2명) 분필로 그려짐
 *  1.55s~ 말풍선(Why? / Feedback / Let's try / Data / Ideas)이 차례로 떠오름
 *  2.6s~ 사람 사이에 분필 선이 이어지고, 머리가 금색·민트색 노드로 빛나며 선을 따라 빛이 오감
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
    bubbleDir: [1, 1, 1, 1, 1],
    font: 20,
    charW: 11,
    bubbleH: 40,
    settle: { dy: 50, k: 1 }, // 이름이 나타날 때 네트워크가 내려앉는 정도(아래로, 크기)
  },
  tall: {
    vb: [400, 720],
    r: 27,
    sw: 3.2,
    people: [
      [92, 100],
      [308, 215],
      [92, 330],
      [308, 445],
      [92, 560],
    ],
    bubbleDir: [1, -1, 1, -1, 1],
    font: 18,
    charW: 10,
    bubbleH: 36,
    settle: { dy: 130, k: 0.75 },
  },
}

const WORDS = ['Why?', 'Feedback', "Let's try", 'Data', 'Ideas']
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
    return { head, body, g, fill, fl, fg, x, y }
  })

  const bubbles = P.map(([x, y], i) => {
    const dx = L.bubbleDir[i]
    const w = WORDS[i].length * L.charW + 32
    const h = L.bubbleH
    const bx = x + dx * (R + 8) + (dx > 0 ? 0 : -w)
    const by = y - R - h - (VW > VH ? 10 : 6)
    const tipA = bx + (dx > 0 ? 22 : w - 10)
    const tipB = bx + (dx > 0 ? 10 : w - 22)
    const path = stroke(
      mk(
        'path',
        {
          d: `M${bx + 10},${by} H${bx + w - 10} Q${bx + w},${by} ${bx + w},${by + 10} V${by + h - 10} Q${bx + w},${by + h} ${bx + w - 10},${by + h} H${tipA} L${x + dx * R * 0.55},${y - R * 0.7} L${tipB},${by + h} H${bx + 10} Q${bx},${by + h} ${bx},${by + h - 10} V${by + 10} Q${bx},${by} ${bx + 10},${by}Z`,
        },
        lines,
      ),
    )
    const text = mk(
      'text',
      {
        x: bx + w / 2,
        y: by + h / 2 + (VW > VH ? 7 : 6),
        'text-anchor': 'middle',
        'font-size': L.font,
        class: 'hero-chalk-word',
        opacity: 0,
      },
      lines,
    )
    text.textContent = WORDS[i]
    return { path, text }
  })

  const trim = (a, b, r) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    return [a[0] + (dx / l) * r, a[1] + (dy / l) * r]
  }
  const links = LINKS.map(([i, j], k) => {
    const A = trim(P[i], P[j], R + 9)
    const B = trim(P[j], P[i], R + 9)
    const dx = B[0] - A[0]
    const dy = B[1] - A[1]
    const l = Math.hypot(dx, dy)
    const bend = (k % 2 ? 1 : -1) * l * 0.16
    const C = [(A[0] + B[0]) / 2 - (dy / l) * bend, (A[1] + B[1]) / 2 + (dx / l) * bend]
    const path = stroke(mk('path', { d: `M${A[0]},${A[1]} Q${C[0]},${C[1]} ${B[0]},${B[1]}` }, lines), L.sw * 0.76)
    const pulse = mk('circle', { r: L.sw * 1.45, fill: '#fff', opacity: 0 }, glow)
    return { path, pulse, A, B, C }
  })

  return { smudges, shift, net, figs, bubbles, links, L }
}

function render(s, t) {
  s.smudges.forEach((e, i) =>
    e.setAttribute('opacity', (0.06 * eo(pr(t, 0.05 + i * 0.12, 0.7)) * (1 - eo(pr(t, CHALK_NAME_AT - 0.1, 0.8)))).toFixed(3)),
  )
  s.figs.forEach((f, i) => {
    // 한 명씩이 아니라 무리 지어 그려집니다: (1·3·5번째) 먼저, (2·4번째) 이어서
    const st = (i % 2 === 0 ? 0.5 : 1.0) + Math.floor(i / 2) * 0.07
    f.head.style.strokeDashoffset = 1 - eio(pr(t, st, 0.5))
    f.body.style.strokeDashoffset = 1 - eio(pr(t, st + 0.25, 0.5))
    const on = eio(pr(t, 2.85 + i * 0.07, 0.55))
    f.g.setAttribute('opacity', (on * 0.55).toFixed(3))
    f.fill.setAttribute('opacity', (on * 0.92).toFixed(3))
  })
  const bOut = 1 - eo(pr(t, 2.9, 0.45))
  s.bubbles.forEach((b, i) => {
    const st = 1.55 + i * 0.22
    b.path.style.strokeDashoffset = 1 - eio(pr(t, st, 0.4))
    b.path.style.opacity = bOut
    b.text.setAttribute('opacity', (eo(pr(t, st + 0.25, 0.28)) * bOut).toFixed(3))
  })
  s.links.forEach((l, k) => {
    l.path.style.strokeDashoffset = 1 - eio(pr(t, 2.6 + k * 0.09, 0.5))
    const pp = pr(t, 3.15 + k * 0.08, 0.85)
    if (pp > 0 && pp < 1) {
      const u = eio(pp)
      const a = (1 - u) * (1 - u)
      const b = 2 * (1 - u) * u
      const c = u * u
      l.pulse.setAttribute('cx', a * l.A[0] + b * l.C[0] + c * l.B[0])
      l.pulse.setAttribute('cy', a * l.A[1] + b * l.C[1] + c * l.B[1])
      l.pulse.setAttribute('opacity', Math.sin(pp * Math.PI).toFixed(3))
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
  const kk = 1 + (k - 1) * u
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
  s.bubbles.forEach((b) => {
    b.path.style.opacity = 0
    b.text.setAttribute('opacity', 0)
  })
  s.links.forEach((l) => {
    l.path.style.opacity = linesOut
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
      // 가장자리 말풍선이 잘리지 않도록 살짝 여백을 둡니다.
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
