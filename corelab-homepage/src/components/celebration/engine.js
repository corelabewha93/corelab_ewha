/**
 * 기념일 효과 엔진 — 큰 축하 화면(팡파레) · 상단 띠 배너 · 풍선/카네이션 · 색종이 · 터치 폭죽 · 로고 장식.
 *
 * "시간 t(초)를 넣으면 그 순간의 화면을 그린다"는 방식이라 움직임이 매끄럽고, 시험(미리보기)도 쉽습니다.
 * 기념일마다 달라지는 글·색·장식은 events.js 와 아래 THEMES 에 모여 있습니다.
 */

const TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeOutBack = (x) => {
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.round(clamp(v + 255 * amt, 0, 255))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

const SPLASH_IN = 0.35 // 큰 축하 화면이 나타나는 시간
const SPLASH_HOLD = 4.0 // 이 시점부터 사라지기 시작
const SPLASH_OUT = 0.7
const FIRST_BANNER_AT = 4.2 // 첫 방문: 축하 화면이 걷힐 즈음 배너가 내려옵니다
const FIRST_AMBIENT_AT = 3.0
const MSG_PERIOD = 3.0

const THEMES = {
  party: {
    confetti: ['#e4d083', '#f5f2e8', '#8fe3ea', '#f28b82', '#f7b6c8', '#b9a6f0', '#ffd166'],
    floaters: ['#e4d083', '#8fe3ea', '#f28b82', '#b9a6f0', '#f7b6c8', '#7fd6a2'],
    petals: false,
    titleColor: '#e4d083',
    titleGlow: 'rgba(228,208,131,.45)',
    subAccent: '#e4d083',
    bannerBg: 'linear-gradient(90deg,#d8c264,#f3e8ae 50%,#d8c264)',
    bannerText: '#0b3d2a',
    btnBg: '#0b4a30',
    btnText: '#f3e8ae',
  },
  carnation: {
    confetti: ['#e8546b', '#f28b9c', '#ffb3bd', '#f5f2e8', '#e4d083', '#ff7a8f'],
    floaters: ['#e8546b', '#f28b9c', '#ff9aa8', '#d63a56', '#f6a5b4'],
    petals: true,
    titleColor: '#ffd1d9',
    titleGlow: 'rgba(242,139,156,.5)',
    subAccent: '#ffb3bd',
    bannerBg: 'linear-gradient(90deg,#efb3bd,#fbdde1 50%,#efb3bd)',
    bannerText: '#5e1a2a',
    btnBg: '#8c2a40',
    btnText: '#fde6e9',
  },
}

const CAKE_SVG = `<svg viewBox="0 0 26 28" width="100%" height="100%"><ellipse cx="13" cy="5" rx="2.1" ry="3" fill="#f28b82" class="cel-flame"/><rect x="12.1" y="7.5" width="1.8" height="4" fill="#0b4a30"/><rect x="3" y="11" width="20" height="6" rx="2" fill="#fff"/><path d="M3 14c2 2 4 2 5 0s3 2 5 0 3 2 5 0 3 2 5 0v3H3z" fill="#f7b6c8"/><rect x="2" y="17" width="22" height="8" rx="2.5" fill="#0b4a30"/><rect x="2" y="21" width="22" height="2" fill="#e4d083"/></svg>`
const HAT_SVG = `<svg viewBox="0 0 30 36" width="100%" height="100%"><defs><clipPath id="cel-cone"><path d="M15 4 L27 32 L3 32 Z"/></clipPath></defs><g clip-path="url(#cel-cone)"><rect width="30" height="36" fill="#f28b82"/><path d="M0 28 L30 14" stroke="#f5f2e8" stroke-width="4"/><path d="M0 18 L30 4" stroke="#e4d083" stroke-width="4"/></g><ellipse cx="15" cy="32.5" rx="13" ry="3" fill="#f5f2e8"/><circle cx="15" cy="4" r="3.6" fill="#8fe3ea"/></svg>`
const CARNATION_SVG = `<svg viewBox="0 0 32 32" width="100%" height="100%"><path d="M16 20c-1 5-6 8-11 8 3-4 6-6 11-8z" fill="#3f9460"/><path d="M16 20c1 5 6 8 11 8-3-4-6-6-11-8z" fill="#3f9460"/><g fill="#d63a56"><circle cx="9" cy="12" r="5"/><circle cx="23" cy="12" r="5"/><circle cx="16" cy="6" r="5"/><circle cx="11" cy="18" r="5"/><circle cx="21" cy="18" r="5"/></g><g fill="#e8546b"><circle cx="16" cy="13" r="8"/></g><g fill="#f28b9c"><circle cx="13" cy="11" r="3.2"/><circle cx="19" cy="12" r="3"/><circle cx="16" cy="16" r="3"/></g></svg>`

/**
 * @param ev      events.js 의 기념일 하나
 * @param options { quick: 처음 큰 축하 화면 없이 바로 은은한 상태로, reduced: 움직임 최소화, onClose, onFanfare }
 */
export function startCelebration(ev, options = {}) {
  const theme = THEMES[ev.theme] ?? THEMES.party
  const reduced = Boolean(options.reduced)
  const firstVisit = !options.quick && !reduced

  let W = 0
  let H = 0
  let S = 1
  let mobile = false
  let dpr = 1
  let cvs = null
  let ctx = null
  let styleEl = null
  let splash = null
  let banner = null
  let hat = null
  let raf = 0
  let paused = false
  let destroyed = false
  const startMs = performance.now()

  let fan0 = firstVisit ? 0 : null // 큰 축하 화면이 시작된 시각 (없으면 null)
  const bannerAt = firstVisit ? FIRST_BANNER_AT : 0.15
  const ambientAt = firstVisit ? FIRST_AMBIENT_AT : 0.3
  let cannon = []
  let sparkles = []
  let bursts = []
  let ambient = []
  let floaters = []
  let lastClick = -9

  /* ---------- 장면 재료 만들기 ---------- */
  function buildScene() {
    const r = rng(11)
    const density = mobile ? 0.55 : 1
    ambient = []
    const nAmb = Math.round(46 * density)
    for (let i = 0; i < nAmb; i++) {
      const v = (70 + r() * 60) * (H / 720)
      ambient.push({
        x: r() * W,
        v,
        period: (H + 40) / v,
        phase: r() * 100,
        w: (6 + r() * 6) * S,
        h: (3.5 + r() * 3.5) * S,
        col: theme.confetti[(r() * theme.confetti.length) | 0],
        spin: 3 + r() * 5,
        ph: r() * TAU,
        sway: (14 + r() * 22) * S,
        swf: 0.9 + r() * 1.3,
        round: r() < 0.2,
      })
    }
    floaters = []
    const nFl = mobile ? 4 : 7
    for (let j = 0; j < nFl; j++) {
      const v = (60 + r() * 40) * (H / 720)
      const travel = (H + 340 * S) / v
      floaters.push({
        seed: 100 + j * 17,
        t0: ambientAt + j * 1.4,
        v,
        travel,
        cycle: travel + 2 + r() * 5,
        r: (mobile ? 24 : 30) + r() * (mobile ? 8 : 12),
        col: theme.floaters[j % theme.floaters.length],
        sway: (12 + r() * 12) * S,
        swf: 0.5 + r() * 0.5,
      })
    }
  }

  function buildFanfare(t0) {
    const r = rng(7 + ((t0 * 10) | 0))
    cannon = []
    ;[
      { side: -1, d: 0.45, n: 80 },
      { side: 1, d: 0.45, n: 80 },
      { side: -1, d: 1.5, n: 40 },
      { side: 1, d: 1.5, n: 40 },
    ].forEach((c) => {
      const n = Math.round(c.n * (mobile ? 0.7 : 1))
      for (let i = 0; i < n; i++) {
        const ang = ((48 + r() * 38) * Math.PI) / 180
        const sp = (850 + r() * 1100) * (H / 720)
        const left = c.side < 0
        cannon.push({
          t0: t0 + c.d + r() * 0.18,
          x0: left ? W * 0.02 : W * 0.98,
          y0: H + 8,
          vx: (left ? 1 : -1) * Math.cos(ang) * sp * (0.8 + r() * 0.4),
          vy: -Math.sin(ang) * sp,
          k: 1.5 + r() * 0.5,
          g: 330 * (H / 720),
          w: (7 + r() * 8) * S,
          h: (4 + r() * 4) * S,
          col: theme.confetti[(r() * theme.confetti.length) | 0],
          spin: 5 + r() * 9,
          ph: r() * TAU,
          sway: (6 + r() * 10) * S,
          swf: 2 + r() * 3,
          round: !theme.petals && r() < 0.18,
        })
      }
    })
    sparkles = []
    for (let i = 0; i < 16; i++) {
      sparkles.push({
        x: W * 0.5 + (r() - 0.5) * W * (mobile ? 0.9 : 0.62),
        y: H * 0.5 + (r() - 0.5) * H * 0.4,
        s: (7 + r() * 11) * S,
        ph: r() * TAU,
        f: 2.5 + r() * 3,
      })
    }
  }

  function addBurst(t, x, y) {
    const r = rng((t * 1000) | 0)
    const n = mobile ? 28 : 40
    for (let i = 0; i < n; i++) {
      const a = r() * TAU
      const sp = (260 + r() * 520) * (H / 720)
      bursts.push({
        t0: t,
        x0: x,
        y0: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        k: 2.4,
        g: 520 * (H / 720),
        w: (6 + r() * 6) * S,
        h: (3.5 + r() * 3) * S,
        col: theme.confetti[(r() * theme.confetti.length) | 0],
        spin: 6 + r() * 8,
        ph: r() * TAU,
        round: !theme.petals && r() < 0.3,
      })
    }
  }

  /* ---------- 그리기 ---------- */
  function piece(p, x, y, tt) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(p.ph + tt * p.spin * 0.5)
    ctx.scale(1, Math.cos(p.ph + tt * p.spin))
    ctx.fillStyle = p.col
    if (theme.petals) {
      ctx.beginPath()
      ctx.ellipse(0, 0, p.w * 0.55, p.h * 0.95, 0, 0, TAU)
      ctx.fill()
    } else if (p.round) {
      ctx.beginPath()
      ctx.arc(0, 0, p.h * 0.75, 0, TAU)
      ctx.fill()
    } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    ctx.restore()
  }

  function drawFlying(list, t, life) {
    for (const p of list) {
      const tt = t - p.t0
      if (tt < 0) continue
      const e = (1 - Math.exp(-p.k * tt)) / p.k
      const x = p.x0 + p.vx * e + (p.sway ? Math.sin(tt * p.swf + p.ph) * p.sway * clamp(tt / 1.2) : 0)
      const y = p.y0 + (p.vy - p.g / p.k) * e + (p.g / p.k) * tt
      if (y > H + 30 || y < -400) continue
      if (life) {
        const a = clamp(1 - tt / life)
        if (a <= 0) continue
        ctx.globalAlpha = a
      }
      piece(p, x, y, tt)
      ctx.globalAlpha = 1
    }
  }

  function drawAmbient(t) {
    const fadeIn = clamp((t - ambientAt) / 2)
    if (fadeIn <= 0) return
    for (const p of ambient) {
      const y = ((t + p.phase) % p.period) * p.v - 20
      const x = p.x + Math.sin(t * p.swf + p.ph) * p.sway
      ctx.globalAlpha = 0.85 * fadeIn
      piece(p, x, y, t)
    }
    ctx.globalAlpha = 1
  }

  function drawBalloon(b, x, y, tt, tilt) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tilt)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.3 * S
    ctx.beginPath()
    ctx.moveTo(0, b.rr * 1.08)
    const L = 74 * S
    for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(i * 0.9 + tt * 2.2) * 5 * S * (i / 8), b.rr * 1.08 + (L * i) / 8)
    ctx.stroke()
    ctx.fillStyle = b.col
    ctx.beginPath()
    ctx.moveTo(0, b.rr)
    ctx.lineTo(-b.rr * 0.13, b.rr * 1.17)
    ctx.lineTo(b.rr * 0.13, b.rr * 1.17)
    ctx.closePath()
    ctx.fill()
    const g = ctx.createRadialGradient(-b.rr * 0.32, -b.rr * 0.38, b.rr * 0.08, 0, 0, b.rr * 1.1)
    g.addColorStop(0, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.22, b.col)
    g.addColorStop(1, shade(b.col, -0.28))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, 0, b.rr * 0.82, b.rr, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  function drawCarnation(b, x, y, tt, tilt) {
    const rr = b.rr * 0.85
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tilt)
    // 줄기와 잎
    ctx.strokeStyle = '#3f9460'
    ctx.lineWidth = 2.4 * S
    ctx.beginPath()
    ctx.moveTo(0, rr * 0.7)
    const L = 90 * S
    for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(i * 0.8 + tt * 1.6) * 6 * S * (i / 8), rr * 0.7 + (L * i) / 8)
    ctx.stroke()
    ctx.fillStyle = '#3f9460'
    ;[
      [-1, 0.38],
      [1, 0.66],
    ].forEach(([side, k]) => {
      ctx.save()
      ctx.translate(Math.sin(k * 6.4 + tt * 1.6) * 6 * S * k, rr * 0.7 + L * k)
      ctx.rotate(side * 0.9)
      ctx.beginPath()
      ctx.ellipse(side * 11 * S, 0, 13 * S, 4.5 * S, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    })
    // 꽃받침
    ctx.fillStyle = '#4aa36b'
    ctx.beginPath()
    ctx.ellipse(0, rr * 0.62, rr * 0.3, rr * 0.2, 0, 0, TAU)
    ctx.fill()
    // 주름진 꽃송이
    const n = 11
    for (let ring = 0; ring < 3; ring++) {
      const r1 = rr * (1 - 0.24 * ring)
      const col = ring === 0 ? shade(b.col, -0.18) : ring === 1 ? b.col : shade(b.col, 0.16)
      ctx.fillStyle = col
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring * 0.3
        ctx.beginPath()
        ctx.arc(Math.cos(a) * r1 * 0.62, Math.sin(a) * r1 * 0.58, r1 * 0.4, 0, TAU)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(0, 0, r1 * 0.62, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(-rr * 0.18, -rr * 0.2, rr * 0.2, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  function drawFloaters(t) {
    for (const f of floaters) {
      const local = t - f.t0
      if (local < 0) continue
      const idx = Math.floor(local / f.cycle)
      const tt = local - idx * f.cycle
      if (tt > f.travel) continue
      const rr = rng(f.seed + idx * 7)
      const x = W * (0.06 + rr() * 0.88) + Math.sin(tt * f.swf * Math.PI + f.seed) * f.sway
      const y = H + 150 * S - f.v * tt
      const tilt = Math.sin(tt * f.swf * Math.PI + f.seed + 1.2) * 0.1
      const item = { rr: f.r * S, col: f.col }
      if (ev.theme === 'carnation') drawCarnation(item, x, y, tt, tilt)
      else drawBalloon(item, x, y, tt, tilt)
    }
  }

  function star(x, y, s, a) {
    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha = a
    ctx.fillStyle = '#fff6c8'
    ctx.shadowColor = '#e4d083'
    ctx.shadowBlur = 10 * S
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? s : s * 0.22
      const ang = (i * Math.PI) / 4
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /* ---------- 화면 요소(DOM) ---------- */
  function cssText() {
    const longest = Math.max(...ev.title.map((l) => l.length))
    const totalChars = ev.title.join(' ').length
    const bigSize = mobile
      ? Math.min(52, Math.floor((0.84 * W) / (longest * 0.52)))
      : Math.min(98, Math.floor((0.8 * W) / (totalChars * 0.52)))
    const subSize = mobile ? 17 : 30
    return `
#cel-splash{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(0,52,30,.95),rgba(0,26,15,.97));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#cel-splash .kick{font:600 ${mobile ? 12 : 15}px/1 var(--font-sans,system-ui,sans-serif);letter-spacing:.42em;text-indent:.42em;color:#8fe3ea;margin-bottom:${mobile ? 14 : 20}px}
#cel-splash .big{font:600 ${bigSize}px/1.08 'Playfair Display',Georgia,serif;color:${theme.titleColor};text-shadow:0 0 30px ${theme.titleGlow},0 3px 0 rgba(0,0,0,.25);white-space:pre}
#cel-splash .big span{display:inline-block;will-change:transform}
#cel-splash .sub{font:700 ${subSize}px/1.5 var(--font-sans,system-ui,sans-serif);color:#f5f2e8;margin-top:${mobile ? 20 : 26}px;padding:0 16px;word-break:keep-all}
#cel-splash .sub b{color:${theme.subAccent}}
#cel-splash .from{font:500 ${mobile ? 13 : 17}px/1 'EB Garamond',Georgia,serif;letter-spacing:.2em;color:#8fe3ea;margin-top:${mobile ? 16 : 22}px}
#cel-banner{position:relative;z-index:90;height:0;overflow:hidden;background:${theme.bannerBg};background-size:200% 100%}
#cel-banner .row{height:${mobile ? 56 : 42}px;display:flex;align-items:center;justify-content:center;gap:${mobile ? 8 : 14}px;padding:0 ${mobile ? 8 : 24}px}
#cel-banner .ico{flex:none;width:${mobile ? 22 : 26}px;height:${mobile ? 24 : 28}px}
#cel-banner .msgs{position:relative;flex:1;max-width:820px;height:${mobile ? 44 : 22}px}
#cel-banner .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font:600 ${mobile ? 12.5 : 14.5}px/1.3 var(--font-sans,system-ui,sans-serif);color:${theme.bannerText};opacity:0;word-break:keep-all}
#cel-banner button{flex:none;font:700 ${mobile ? 11 : 12.5}px/1 var(--font-sans,system-ui,sans-serif);background:${theme.btnBg};color:${theme.btnText};border:0;border-radius:999px;padding:${mobile ? '8px 10px' : '8px 14px'};white-space:nowrap;cursor:pointer}
#cel-banner button.x{background:transparent;color:${theme.bannerText};font-size:${mobile ? 18 : 20}px;padding:2px ${mobile ? 4 : 6}px;opacity:.7}
#cel-hat{position:fixed;z-index:106;pointer-events:none;width:${ev.theme === 'carnation' ? (mobile ? 16 : 20) : mobile ? 17 : 22}px;height:${ev.theme === 'carnation' ? (mobile ? 16 : 20) : mobile ? 20 : 26}px;opacity:0}
`
  }

  function setupDom() {
    styleEl = document.createElement('style')
    styleEl.id = 'cel-style'
    document.head.appendChild(styleEl)

    if (!reduced) {
      splash = document.createElement('div')
      splash.id = 'cel-splash'
      splash.setAttribute('aria-hidden', 'true')
      splash.style.visibility = 'hidden'
      document.body.appendChild(splash)

      cvs = document.createElement('canvas')
      cvs.setAttribute('aria-hidden', 'true')
      cvs.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:105;pointer-events:none'
      document.body.appendChild(cvs)
      ctx = cvs.getContext('2d')
    }

    banner = document.createElement('div')
    banner.id = 'cel-banner'
    banner.setAttribute('role', 'region')
    banner.setAttribute('aria-label', '기념일 안내')
    banner.innerHTML = `<div class="row">
      <div class="ico">${ev.theme === 'carnation' ? CARNATION_SVG : CAKE_SVG}</div>
      <div class="msgs">${ev.messages.map((m) => `<div class="msg"></div>`).join('')}</div>
      ${reduced ? '' : `<button type="button" class="again">${ev.replayLabel}</button>`}
      <button type="button" class="x" aria-label="닫기">×</button></div>`
    banner.querySelectorAll('.msg').forEach((el, i) => (el.textContent = ev.messages[i]))
    document.body.insertBefore(banner, document.body.firstChild)
    banner.querySelector('.again')?.addEventListener('click', () => fanfare())
    banner.querySelector('.x').addEventListener('click', () => {
      options.onClose?.()
      destroy()
    })

    hat = document.createElement('div')
    hat.id = 'cel-hat'
    hat.setAttribute('aria-hidden', 'true')
    hat.innerHTML = ev.theme === 'carnation' ? CARNATION_SVG : HAT_SVG
    document.body.appendChild(hat)
  }

  function fillSplash() {
    const letterSpans = (word) => word.split('').map((c) => `<span>${c === ' ' ? '&nbsp;' : c.replace('<', '&lt;')}</span>`).join('')
    const title = mobile
      ? ev.title.map((w) => `<div>${letterSpans(w)}</div>`).join('')
      : letterSpans(ev.title.join(' '))
    splash.innerHTML = `<div class="kick">${ev.kicker}</div><div class="big">${title}</div><div class="sub"><b></b><span></span></div><div class="from"></div>`
    splash.querySelector('.sub b').textContent = ev.sub[0]
    splash.querySelector('.sub span').textContent = ev.sub[1]
    splash.querySelector('.from').textContent = ev.from
  }

  function layout() {
    W = window.innerWidth
    H = window.innerHeight
    mobile = W < 600
    S = mobile ? 0.62 : 1
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (cvs) {
      cvs.width = Math.round(W * dpr)
      cvs.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    styleEl.textContent = cssText()
    if (splash) fillSplash()
    buildScene()
    if (fan0 !== null) buildFanfare(fan0)
  }

  function renderDom(t) {
    const BH = mobile ? 56 : 42
    const bT = t - bannerAt
    banner.style.height = BH * easeOut(clamp(bT / 0.7)) + 'px'
    banner.style.backgroundPosition = ((t * 25) % 200) + '% 0'
    banner.querySelector('.cel-flame')?.setAttribute('ry', String(3.0 + Math.sin(t * 14) * 0.5))
    const msgs = banner.querySelectorAll('.msg')
    const local = bT - 0.5
    msgs.forEach((m, i) => {
      let o = 0
      let ty = 0
      if (reduced) {
        o = i === 0 ? 1 : 0
      } else if (local >= 0) {
        const idx = Math.floor(local / MSG_PERIOD) % ev.messages.length
        if (idx === i) {
          const lt = local % MSG_PERIOD
          o = Math.min(clamp(lt / 0.4), clamp((MSG_PERIOD - lt) / 0.4))
          ty = (1 - clamp(lt / 0.4)) * 8
        }
      } else if (i === 0) {
        o = clamp(bT / 0.5)
      }
      m.style.opacity = String(o)
      m.style.transform = `translateY(${ty}px)`
    })

    // 로고 장식 — 헤더 로고 위의 파란 사람 머리 위
    const wm = document.querySelector('.site-header .core-wordmark')
    if (wm && hat) {
      const r = wm.getBoundingClientRect()
      const hatT = firstVisit ? 4.4 : 0.5
      const k = clamp((t - hatT) / 0.9)
      const drop = !reduced && k < 1 ? (1 - easeOut(k)) * -50 : 0
      const sinceLand = t - hatT - 0.9
      const bounce = !reduced && k >= 1 ? Math.sin(sinceLand * 5) * 1.5 * Math.exp(-sinceLand * 0.8) : 0
      const carn = ev.theme === 'carnation'
      hat.style.opacity = String(r.bottom < 0 ? 0 : clamp(k * 3))
      hat.style.left = r.left + r.width * 0.575 - (carn ? (mobile ? 5 : 7) : mobile ? 6 : 8) + 'px'
      hat.style.top = r.top - (carn ? (mobile ? 9 : 12) : mobile ? 14 : 19) + drop + bounce + 'px'
      hat.style.transform = `rotate(${(carn ? 6 : 12) + (reduced ? 0 : Math.sin(t * 2.2) * 2)}deg)`
    }

    // 큰 축하 화면
    if (splash) {
      if (fan0 === null) {
        splash.style.visibility = 'hidden'
        return
      }
      const tf = t - fan0
      if (tf > SPLASH_HOLD + SPLASH_OUT + 0.05 || tf < 0) {
        splash.style.visibility = 'hidden'
        cvs.style.zIndex = '105'
        return
      }
      splash.style.visibility = 'visible'
      cvs.style.zIndex = '10001'
      const inA = clamp(tf / SPLASH_IN)
      const outA = 1 - clamp((tf - SPLASH_HOLD) / SPLASH_OUT)
      splash.style.opacity = String(Math.min(inA, outA))
      splash.style.transform = `scale(${1 + 0.05 * clamp((tf - SPLASH_HOLD) / SPLASH_OUT)})`
      splash.querySelectorAll('.big span').forEach((s, i) => {
        const k = easeOutBack(clamp((tf - 0.55 - i * 0.05) / 0.5))
        s.style.transform = `scale(${k}) translateY(${(1 - k) * -26}px) rotate(${(1 - k) * -10}deg)`
      })
      const fa = (sel, t0) => {
        const el = splash.querySelector(sel)
        const a = easeOut(clamp((tf - t0) / 0.6))
        el.style.opacity = String(a)
        el.style.transform = `translateY(${(1 - a) * 16}px)`
      }
      fa('.kick', 0.35)
      fa('.sub', 1.45)
      fa('.from', 1.95)
    }
  }

  function render(t) {
    if (destroyed) return
    renderDom(t)
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    if (fan0 !== null) {
      const tf = t - fan0
      if (tf > 1.1 && tf < 4.7) {
        const fade = Math.min(clamp((tf - 1.1) / 0.6), 1 - clamp((tf - 4.0) / 0.7))
        sparkles.forEach((s) => {
          const tw = Math.abs(Math.sin(tf * s.f + s.ph))
          star(s.x, s.y, s.s * (0.55 + 0.45 * tw), fade * (0.35 + 0.65 * tw))
        })
      }
    }
    drawAmbient(t)
    drawFlying(cannon, t, 0)
    drawFloaters(t)
    if (bursts.length) {
      drawFlying(bursts, t, 1.7)
      bursts = bursts.filter((b) => t - b.t0 < 1.8)
    }
  }

  /* ---------- 동작 ---------- */
  function now() {
    return (performance.now() - startMs) / 1000
  }

  function fanfare() {
    if (reduced || destroyed) return
    fan0 = now()
    buildFanfare(fan0)
    options.onFanfare?.()
  }

  function loop() {
    if (destroyed) return
    if (!paused) render(now())
    raf = requestAnimationFrame(loop)
  }

  function onPointer(e) {
    if (reduced || destroyed) return
    if (e.target && e.target.closest && e.target.closest('#cel-banner')) return
    const t = now()
    if (t - lastClick < 0.18) return
    lastClick = t
    addBurst(t, e.clientX, e.clientY)
  }

  let resizeTimer = 0
  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => !destroyed && layout(), 120)
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    cancelAnimationFrame(raf)
    clearTimeout(resizeTimer)
    window.removeEventListener('pointerdown', onPointer)
    window.removeEventListener('resize', onResize)
    ;[splash, cvs, banner, hat, styleEl].forEach((el) => el && el.remove())
  }

  setupDom()
  layout()
  if (fan0 !== null) buildFanfare(fan0)
  window.addEventListener('pointerdown', onPointer, { passive: true })
  window.addEventListener('resize', onResize)
  raf = requestAnimationFrame(loop)

  return {
    destroy,
    fanfare,
    render,
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
    },
    burstAt: (t, x, y) => addBurst(t, x, y),
  }
}
