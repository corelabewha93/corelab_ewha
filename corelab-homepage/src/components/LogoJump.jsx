import { useEffect } from 'react'

/**
 * 로고 깜짝 움직임 (두 가지, 기존 화면 디자인은 그대로이고 "눌렀을 때만" 움직입니다)
 *
 * 1) 맨 위 헤더의 CoRe Lab 로고를 누르면 → 로고가 통! 하고 한 번 점프합니다.
 *    (홈이면 맨 위로 부드럽게 올라가고, 다른 페이지면 홈으로 이동하는 기존 동작은 그대로)
 * 2) 홈 인트로 애니메이션이 모두 끝난 뒤, 가운데 큰 CoRe Lab 로고를 누르면 → 큰 로고가 점프하고,
 *    착지하는 순간 반짝이가 터지며 "Seeing How We Learn Together" 글자가 물결치고
 *    "Learn Together"가 금빛으로 환하게 빛납니다.
 *
 * 모바일은 스크롤하다 잘못 터지지 않도록 아주 보수적으로 반응합니다.
 *  - 로고 글자 영역을 "짧게 톡" 쳤을 때만 (10px 넘게 움직였거나 0.3초 넘게 눌렀거나 스크롤됐으면 무시)
 *  - 스크롤이 멈춘 직후 0.5초 동안은 무시, 한 번 터지면 6초는 쉼
 * "움직임 줄이기" 설정을 쓰는 분께는 점프·반짝임 없이 문구만 은은하게 빛납니다(헤더 로고는 그대로).
 */

const NS = 'http://www.w3.org/2000/svg'
const K = (a, b, x) => a + (b - a) * x
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
// 점프 한 번의 모양: [진행도, 높이(0~-1), 가로 배율, 세로 배율] — 꾹 눌렸다가 → 솟고 → 착지에 찌그러졌다 → 작게 한 번 더 통
const KF = [
  [0, 0, 1, 1],
  [0.14, 0, 1.07, 0.84],
  [0.4, -1, 0.94, 1.11],
  [0.66, 0, 1.1, 0.82],
  [0.8, -0.27, 0.98, 1.04],
  [0.92, 0, 1.03, 0.96],
  [1, 0, 1, 1],
]
function pose(p) {
  p = clamp(p)
  for (let i = 1; i < KF.length; i++) {
    if (p <= KF[i][0]) {
      const a = KF[i - 1]
      const b = KF[i]
      const x = ease((p - a[0]) / (b[0] - a[0]))
      return [K(a[1], b[1], x), K(a[2], b[2], x), K(a[3], b[3], x)]
    }
  }
  return [0, 1, 1]
}

function wrapG(g) {
  const w = document.createElementNS(NS, 'g')
  g.parentNode.insertBefore(w, g)
  w.appendChild(g)
  return w
}
function unwrapG(w) {
  const g = w.firstChild
  if (g && w.parentNode) {
    w.parentNode.insertBefore(g, w)
    w.remove()
  }
}

function makeStar(size, color) {
  const e = document.createElementNS(NS, 'svg')
  e.setAttribute('viewBox', '-10 -10 20 20')
  e.setAttribute('aria-hidden', 'true')
  e.style.cssText = `position:fixed;z-index:60;pointer-events:none;width:${size}px;height:${size}px;opacity:0;overflow:visible;filter:drop-shadow(0 0 4px rgba(255,236,160,.9))`
  e.innerHTML = `<path d="M0-10 L2.6-2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6-2.6Z" fill="${color}"/>`
  document.body.appendChild(e)
  return e
}

let running = false

/* ───────────── 1) 헤더 로고 점프 ───────────── */
function headerJump() {
  if (running) return
  const wm = document.querySelector('.site-header .brand-wordmark')
  const svg = wm && wm.querySelector('.core-wordmark')
  if (!wm || !svg) return
  const gs = [...svg.children].filter((n) => n.tagName.toLowerCase() === 'g')
  if (gs.length < 4) return
  running = true
  const dotA = wrapG(gs[2])
  const dotB = wrapG(gs[3])
  dotA.style.transformBox = 'fill-box'
  dotB.style.transformBox = 'fill-box'
  dotB.style.transformOrigin = '50% 100%'
  const fs = parseFloat(getComputedStyle(wm).fontSize) || 20
  const hop = fs * 0.6
  const vb = svg.viewBox.baseVal
  const unit = vb.height / (svg.getBoundingClientRect().height || fs)
  const dust = [0, 1].map(() => {
    const d = document.createElement('div')
    d.setAttribute('aria-hidden', 'true')
    d.style.cssText =
      'position:fixed;z-index:101;pointer-events:none;border-radius:50%;background:rgba(245,242,232,.8);opacity:0'
    document.body.appendChild(d)
    return d
  })
  wm.style.transformOrigin = '50% 100%'
  wm.style.willChange = 'transform'
  const D = 1.1
  const t0 = performance.now()
  const frame = (now) => {
    const s = (now - t0) / 1000
    const r = wm.getBoundingClientRect()
    if (s >= D + 0.15 || !wm.isConnected) {
      wm.style.transform = ''
      wm.style.transformOrigin = ''
      wm.style.willChange = ''
      unwrapG(dotA)
      unwrapG(dotB)
      dust.forEach((d) => d.remove())
      running = false
      return
    }
    const [y, sx, sy] = pose(s / D)
    wm.style.transform = `translateY(${y * hop}px) scale(${sx},${sy})`
    const pa = pose((s - 0.07) / D)
    const pb = pose((s - 0.12) / D)
    dotA.style.transform = `translateY(${pa[0] * hop * 0.4 * unit}px)`
    dotB.style.transform = `translateY(${pb[0] * hop * 0.65 * unit}px) rotate(${pb[0] < 0 ? 12 * pb[0] : 0}deg)`
    // 착지 먼지
    const lp = (s - 0.66) / 0.5
    dust.forEach((d, i) => {
      const w = 4 + lp * 10
      const h = 2 + lp * 3
      d.style.opacity = lp > 0 && lp < 1 ? String(0.7 * (1 - lp)) : '0'
      d.style.width = `${w}px`
      d.style.height = `${h}px`
      d.style.left = `${(i ? r.right - r.width * 0.18 : r.left + r.width * 0.08) - w / 2 + (i ? lp * 8 : -lp * 8)}px`
      d.style.top = `${r.bottom - 3}px`
    })
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/* ───────────── 2) 홈 가운데 큰 로고 + 모토 ───────────── */
function heroSurprise(px, py, reduced) {
  if (running) return
  const h1 = document.querySelector('.hero-intro.hero-phase-done .hero-name')
  const motto = document.querySelector('.hero-intro.hero-phase-done .hero-motto')
  const ov = document.querySelector('.hero-intro.hero-phase-done .hero-logo-overlay')
  if (!h1 || !motto) return
  running = true

  const T0 = 0.12 // 점프 시작
  const TW = 0.62 // 모토 물결 시작
  const TEND = 3.4 // 금빛 여운이 사라지는 시각
  const TOTAL = 3.9
  const GOLD = [255, 244, 194]
  const mix = (a, b, u) => a.map((v, k) => Math.round(K(v, b[k], u)))
  const bump = (u) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u))

  const made = [] // 끝나면 지울 임시 요소
  const add = (el) => {
    made.push(el)
    return el
  }

  const h1r = h1.getBoundingClientRect()
  const ovr = ov ? ov.getBoundingClientRect() : null
  const svgEl = ov ? ov.querySelector('svg') : null
  const unit = svgEl ? svgEl.viewBox.baseVal.height / (svgEl.getBoundingClientRect().height || 1) : 1
  const dots = ov ? [...ov.querySelectorAll('.hero-logo-dot')].map(wrapG) : []
  const hop = reduced ? 0 : h1r.height * 0.8 * 0.42
  const ox = h1r.left + h1r.width / 2
  const oy = h1r.bottom

  // 모토: 글자별 덧그림 (그라데이션 글자라서, 같은 자리에 같은 색으로 한 글자씩 그려 움직입니다)
  const cs = getComputedStyle(motto)
  const mr = motto.getBoundingClientRect()
  const walker = document.createTreeWalker(motto, NodeFilter.SHOW_TEXT)
  const letters = []
  let full = ''
  let n
  while ((n = walker.nextNode())) {
    for (let i = 0; i < n.data.length; i++) {
      const c = n.data[i]
      const rg = document.createRange()
      rg.setStart(n, i)
      rg.setEnd(n, i + 1)
      const rc = rg.getBoundingClientRect()
      full += c
      if (c.trim() && rc.width > 0) letters.push({ c, idx: full.length - 1, rc })
    }
  }
  const phrase = 'Learn Together'
  const emS = full.indexOf(phrase)
  const emE = emS + phrase.length
  const stops = [
    [0, [143, 220, 242]],
    [0.48, [166, 236, 234]],
    [1, [194, 245, 217]],
  ]
  const grad = (x) => {
    x = clamp(x)
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const a = stops[i - 1]
        const b = stops[i]
        const u = (x - a[0]) / (b[0] - a[0])
        return a[1].map((v, k) => Math.round(K(v, b[1][k], u)))
      }
    }
    return stops[2][1]
  }
  const layer = add(document.createElement('div'))
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;display:none'
  document.body.appendChild(layer)
  letters.forEach((L) => {
    const s = document.createElement('span')
    s.textContent = L.c
    s.style.cssText = `position:fixed;left:${L.rc.left}px;top:${L.rc.top}px;height:${L.rc.height}px;line-height:${L.rc.height}px;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};letter-spacing:${cs.letterSpacing};-webkit-text-stroke:${cs.webkitTextStrokeWidth} currentColor;white-space:pre;transform-origin:50% 80%`
    L.el = s
    L.em = emS >= 0 && L.idx >= emS && L.idx < emE
    L.base = grad((L.rc.left + L.rc.width / 2 - mr.left) / (mr.width || 1))
    layer.appendChild(s)
  })
  const fs = parseFloat(cs.fontSize) || 24
  const emRects = letters.filter((l) => l.em).map((l) => l.rc)
  const eb = emRects.length
    ? {
        l: Math.min(...emRects.map((r) => r.left)),
        r: Math.max(...emRects.map((r) => r.right)),
        t: Math.min(...emRects.map((r) => r.top)),
        b: Math.max(...emRects.map((r) => r.bottom)),
      }
    : null

  // 반짝이·먼지·클릭 링
  let seed = 42
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const burst = reduced
    ? []
    : [...Array(12)].map((_, i) => ({
        e: add(makeStar(fs * 0.34 * (0.6 + rnd() * 0.7), ['#fff6c8', '#e4d083', '#8fe3ea', '#f5f2e8'][i % 4])),
        a: (i / 12) * Math.PI * 2 + rnd() * 0.4,
        d: h1r.height * (0.7 + rnd() * 0.7),
      }))
  const twinkle =
    reduced || !eb
      ? []
      : [...Array(9)].map((_, i) => ({
          e: add(makeStar(fs * 0.3 * (0.6 + rnd() * 0.8), '#fff6c8')),
          x: eb.l + ((eb.r - eb.l) * (i + 0.5)) / 9 + (rnd() - 0.5) * 20,
          y: (i % 2 ? eb.t - fs * 0.12 : eb.b + fs * 0.02) + (rnd() - 0.5) * fs * 0.25,
          ph: rnd() * 6,
          f: 5 + rnd() * 4,
        }))
  const dust = reduced
    ? []
    : [0, 1].map(() => {
        const d = add(document.createElement('div'))
        d.setAttribute('aria-hidden', 'true')
        d.style.cssText =
          'position:fixed;z-index:49;pointer-events:none;border-radius:50%;background:rgba(245,242,232,.7);opacity:0'
        document.body.appendChild(d)
        return d
      })
  const ring = reduced ? null : add(document.createElement('div'))
  if (ring) {
    ring.setAttribute('aria-hidden', 'true')
    ring.style.cssText =
      'position:fixed;z-index:70;pointer-events:none;border-radius:50%;border:3px solid rgba(255,255,255,.85);opacity:0'
    document.body.appendChild(ring)
  }

  const scrollY0 = window.scrollY
  const t0 = performance.now()
  let ended = false
  const end = () => {
    if (ended) return
    ended = true
    h1.style.transform = ''
    h1.style.transformOrigin = ''
    if (ov) {
      ov.style.transform = ''
      ov.style.transformOrigin = ''
    }
    dots.forEach(unwrapG)
    motto.style.visibility = ''
    made.forEach((el) => el.remove())
    running = false
  }

  const frame = (now) => {
    const t = (now - t0) / 1000
    // 도중에 스크롤하거나 화면이 바뀌면 바로 정리 (글자 덧그림이 제자리에서 벗어나지 않게)
    if (t >= TOTAL || !h1.isConnected || Math.abs(window.scrollY - scrollY0) > 4) return end()
    const s = t - T0

    if (ring) {
      const rp = t / 0.5
      ring.style.opacity = rp > 0 && rp < 1 ? String(0.9 * (1 - rp)) : '0'
      const rr = 10 + rp * 60
      ring.style.left = `${px - rr}px`
      ring.style.top = `${py - rr}px`
      ring.style.width = ring.style.height = `${2 * rr}px`
    }

    if (!reduced) {
      const [y, sx, sy] = pose(s / 1.1)
      const tf = `translateY(${y * hop}px) scale(${sx},${sy})`
      h1.style.transformOrigin = '50% 100%'
      h1.style.transform = tf
      if (ov && ovr) {
        ov.style.transformOrigin = `${ox - ovr.left}px ${oy - ovr.top}px`
        ov.style.transform = tf
        const pa = pose((s - 0.07) / 1.1)
        const pb = pose((s - 0.12) / 1.1)
        if (dots[0]) dots[0].style.transform = `translateY(${pa[0] * hop * 0.4 * unit}px)`
        if (dots[1]) {
          dots[1].style.transformBox = 'fill-box'
          dots[1].style.transformOrigin = '50% 100%'
          dots[1].style.transform = `translateY(${pb[0] * hop * 0.65 * unit}px) rotate(${pb[0] < 0 ? 12 * pb[0] : 0}deg)`
        }
      }
      // 착지 먼지
      const lp = (s - 0.66) / 0.5
      dust.forEach((d, i) => {
        const w = 6 + lp * h1r.width * 0.05
        const h = 3 + lp * 7
        d.style.opacity = lp > 0 && lp < 1 ? String(0.7 * (1 - lp)) : '0'
        d.style.width = `${w}px`
        d.style.height = `${h}px`
        d.style.left = `${(i ? h1r.right - h1r.width * 0.12 : h1r.left + h1r.width * 0.12) + (i ? 1 : -1) * lp * 20 - w / 2}px`
        d.style.top = `${h1r.bottom - h1r.height * 0.12}px`
      })
      // 착지 반짝이 폭죽
      const bp = (s - 0.66) / 0.9
      burst.forEach((b) => {
        const on = bp > 0 && bp < 1
        b.e.style.opacity = on ? String(1 - bp) : '0'
        const dd = b.d * (1 - Math.pow(1 - clamp(bp), 3))
        b.e.style.left = `${ox + Math.cos(b.a) * dd * 1.5 - fs * 0.17}px`
        b.e.style.top = `${h1r.top + h1r.height * 0.45 + Math.sin(b.a) * dd * 0.9 - fs * 0.17}px`
        b.e.style.transform = `rotate(${bp * 120}deg) scale(${0.6 + 0.6 * Math.sin(Math.PI * clamp(bp))})`
      })
    }

    // 모토 글자 물결 + Learn Together 금빛
    const active = t >= TW - 0.02
    layer.style.display = active ? 'block' : 'none'
    motto.style.visibility = active ? 'hidden' : 'visible'
    letters.forEach((L, j) => {
      const st = TW + j * 0.034
      const u = (t - st) / 0.5
      const b = bump(u)
      const tail = L.em ? clamp(1 - (t - (TW + 0.9)) / (TEND - (TW + 0.9))) * clamp((t - (st + 0.15)) / 0.2) * 0.55 : 0
      const amt = Math.min(1, (L.em ? b : reduced ? 0 : b * 0.4) + tail)
      const col = mix(L.base, GOLD, amt)
      const hy = reduced ? 0 : -(L.em ? 0.2 : 0.09) * fs * b
      const sc = reduced ? 1 : 1 + (L.em ? 0.14 : 0.04) * b
      L.el.style.color = `rgb(${col})`
      L.el.style.transform = `translateY(${hy}px) scale(${sc})`
      L.el.style.textShadow = L.em ? `0 0 ${14 * amt}px rgba(255,236,160,${0.85 * amt})` : 'none'
    })
    // 모토 주변 별 반짝
    const tw = (t - (TW + 0.25)) / 2.2
    twinkle.forEach((w) => {
      const on = tw > 0 && tw < 1
      const a = on ? Math.abs(Math.sin(t * w.f + w.ph)) * Math.sin(Math.PI * tw) : 0
      w.e.style.opacity = String(a)
      w.e.style.left = `${w.x - fs * 0.15}px`
      w.e.style.top = `${w.y - fs * 0.15}px`
      w.e.style.transform = `scale(${0.5 + a * 0.9}) rotate(${t * 40}deg)`
    })
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/* ───────────── 입력 감지 ───────────── */
function useLogoJump() {
  useEffect(() => {
    const mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const reduced = () => !!(mqReduce && mqReduce.matches)

    let lastScroll = 0
    const onScroll = () => {
      lastScroll = performance.now()
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // 헤더 로고
    const onClick = (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest && e.target.closest('.site-header a.brand')
      if (!a || reduced()) return
      headerJump()
    }
    document.addEventListener('click', onClick)

    // 홈 큰 로고: "톡" 한 번
    let down = null
    let cooldownUntil = 0
    const hitRect = (touch) => {
      const h1 = document.querySelector('.hero-intro.hero-phase-done .hero-name')
      if (!h1) return null
      const r = h1.getBoundingClientRect()
      const pad = touch ? 4 : 28
      return { l: r.left - pad, r: r.right + pad, t: r.top - pad, b: r.bottom + pad }
    }
    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      down = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        sy: window.scrollY,
        touch: e.pointerType !== 'mouse',
        since: performance.now() - lastScroll, // 직전 스크롤 후 경과 시간
        target: e.target,
      }
    }
    const onUp = (e) => {
      const d = down
      down = null
      if (!d || running) return
      const now = performance.now()
      if (now < cooldownUntil) return
      if (d.target && d.target.closest && d.target.closest('a,button,input,textarea,select,label,[role=button],.modal-overlay,.admin-fab')) return
      if (document.documentElement.classList.contains('modal-locked')) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (Math.hypot(dx, dy) > (d.touch ? 10 : 6)) return
      if (now - d.t > (d.touch ? 300 : 700)) return
      if (Math.abs(window.scrollY - d.sy) > 2) return
      if (d.touch && d.since < 500) return // 스크롤 직후 멈추려고 건드린 손가락
      const sel = window.getSelection && window.getSelection()
      if (sel && String(sel).length > 0) return
      const r = hitRect(d.touch)
      if (!r || e.clientX < r.l || e.clientX > r.r || e.clientY < r.t || e.clientY > r.b) return
      cooldownUntil = now + (d.touch ? 6000 : 4500)
      heroSurprise(e.clientX, e.clientY, reduced())
    }
    const onCancel = () => {
      down = null
    }
    document.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointercancel', onCancel, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [])
}

export default function LogoJump() {
  useLogoJump()
  return null
}
