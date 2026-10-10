import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import HeroChalk, { CHALK_NAME_AT, CONV_AT } from './HeroChalk'
import HeroAmbient, { fitAmbientRoom } from './HeroAmbient'
import { LOGO_TRANSFORM, INNER_SCALE, LETTERS, DOT_A, DOT_B, CURVE } from './coreLogoPaths'

/**
 * 메인 화면 인트로 — "CoRe"가 COllaborative REsearch에서 왔다는 걸 보여주는 모션.
 *
 *  0) chalk     : 녹색 칠판에 분필로 사람들이 그려지고, 대화하다가 네트워크로 이어짐 (HeroChalk.jsx)
 *  1) intro     : 정식 이름 "Collaborative Research Learning Lab"이 한 번에, 초점이 맞춰지듯
 *                 (흐릿 → 또렷) 나타남 (글자 크기·간격은 그대로라 흔들리지 않음)
 *  2) highlight : Co · Re가 금빛으로 켜지고, 나머지 글자는 옅어짐
 *  3) fade      : 약자에 쓰이지 않는 글자가 조용히 사라짐
 *  4) merge     : 남은 Co · Re · Lab이 한 번의 부드러운 움직임으로 미끄러져 모이며 "CoRe Lab"으로 커짐
 *                 (글자 배치를 바꾸는 대신 위치·크기 변환(transform)만으로 움직여 끊김이 없습니다)
 *  5) done      : 칠판의 학생들이 "CoRe"의 두 학습자 점(o 위 · R 위)으로 모여 들어가고(HeroChalk.jsx),
 *                 두 점 사이에 어깨선이 그려져 로고가 완성됨 → 정식 이름(작게, CO·RE 금색) → 모토 → 소속
 *
 * - 이름 속 "Co"와 "Re"는 처음부터 CoRe 로고의 글자(coreLogoPaths.js)로 그립니다. 나머지 글자는
 *   로고와 결이 같은 글꼴(Philosopher)이라, 합쳐진 뒤 글꼴이 바뀌는 순간이 없습니다.
 *
 * - tagline(site.json의 labTagline)과 labName(site.json의 labName)을 보고 남길 글자를 자동으로 찾습니다.
 *   관리자 화면에서 이름을 바꿔도 코드를 고칠 필요가 없습니다.
 * - 약자를 정식 이름에서 찾지 못하면(철자가 안 맞으면) 모션 없이 완성된 화면을 보여줍니다.
 * - "동작 줄이기"를 켜 둔 기기에서는 처음부터 완성된 화면을 보여줍니다.
 * - 한 번 끝까지 본 뒤 사이트 안에서 다시 홈으로 돌아오면 바로 완성된 화면을 보여줍니다.
 *   (새로고침하거나 새로 접속하면 다시 처음부터 재생)
 */

/** 약자(target)의 글자들을 정식 이름의 단어 앞부분에서 순서대로 찾아 짝지어줍니다. */
function matchWords(words, target) {
  function solve(wi, ti) {
    if (ti === target.length) return []
    if (wi === words.length) return null
    const w = words[wi]
    let k = 0
    while (k < w.length && ti + k < target.length && w[k] === target[ti + k]) k++
    // 가능한 한 길게 맞춰 보고, 안 되면 조금씩 줄여 봅니다.
    for (let len = k; len >= 1; len--) {
      const rest = solve(wi + 1, ti + len)
      if (rest) return [{ wi, len }, ...rest]
    }
    return solve(wi + 1, ti) // 이 단어는 통째로 사라지는 글자로
  }
  return solve(0, 0)
}

/**
 * 정식 이름을 단어별로 나누고, 각 단어를 "남는 글자 / 사라지는 글자" 조각으로 나눕니다.
 * 반환: [{ pieces: [{ text, keep, part }], keepSpace, part }]
 *   pieces.part : 약자에서 몇 번째 단어인지 (0 = "CoRe", 1 = "Lab")
 *   keepSpace   : 이 단어 뒤의 띄어쓰기가 완성된 약자에도 남는지 ("CoRe Lab"의 가운데 띄어쓰기)
 * 예: "Collaborative Research Learning Lab" + "CoRe Lab"
 *     → [Co]llaborative [Re]search Learning [Lab]
 * (단어를 통째로 하나의 묶음으로 두기 때문에, 좁은 화면에서도 단어 중간에서 줄이 바뀌지 않습니다.)
 */
export function splitName(tagline = '', labName = '') {
  const words = tagline.trim().split(/\s+/).filter(Boolean)
  const parts = labName.trim().split(/\s+/).filter(Boolean)
  const target = parts.join('')
  if (!words.length || !target) return null

  const matches = matchWords(words, target)
  if (!matches) return null

  // 약자 글자 번호 → 약자에서 몇 번째 단어인지 / 그 글자 뒤에 띄어쓰기가 오는지
  const partOf = []
  const spaceAfter = []
  parts.forEach((p, pi) => {
    for (let i = 0; i < p.length; i++) {
      partOf.push(pi)
      spaceAfter.push(i === p.length - 1 && pi < parts.length - 1)
    }
  })

  const byWord = new Map(matches.map((m) => [m.wi, m.len]))
  let ti = 0
  return words.map((w, wi) => {
    const len = byWord.get(wi) ?? 0
    const pieces = []
    if (len > 0) {
      pieces.push({ text: w.slice(0, len), keep: true, part: partOf[ti] })
      if (w.length > len) pieces.push({ text: w.slice(len), keep: false })
      ti += len
    } else {
      pieces.push({ text: w, keep: false })
    }
    return { pieces, keepSpace: len > 0 && spaceAfter[ti - 1] }
  })
}

// ---- CoRe 로고 글자 · 두 학습자 점 · 어깨선 ----
const DOT_A_COLOR = '#f5f2e8' // o 위 학습자: 분필 아이보리
const DOT_B_COLOR = '#8fe3ea' // R 위 학습자 · 어깨선: 민트
const DOT_A_C = { x: 553, y: 406 }
const DOT_B_C = { x: 783.5, y: 310 }
// 로고 글자 경로를 C·o / R·e 두 조각으로 나눕니다 (첫 조각이 "Co", 나머지가 "Re").
const SUBPATHS = LETTERS.split(/(?=M)/).map((d) => d.trim()).filter(Boolean)
const GLYPH_U = 223 / 0.47 // 로고 x높이(223) = 글꼴(Philosopher) x높이(0.47em) → 1em에 해당하는 로고 좌표 길이
const GLYPH_TOP = 675 - 0.8 * GLYPH_U // 로고 기준선(675)이 글자 기준선과 맞도록 (vertical-align -0.2em과 짝)
const GLYPHS = {
  Co: { x0: 135, x1: 711, paths: [SUBPATHS[0]] },
  Re: { x0: 711, x1: 1233, paths: SUBPATHS.slice(1) },
}
const OVERLAY_X0 = GLYPHS.Co.x0
const OVERLAY_X1 = GLYPHS.Re.x1

/** 이름 속 "Co" / "Re"를 로고 글자 그대로 그립니다. (글자 크기(em)에 따라 함께 커지고 작아집니다) */
function Glyph({ text }) {
  const g = GLYPHS[text]
  if (!g) return text
  return (
    <svg
      className="hero-glyph"
      viewBox={`${g.x0} ${GLYPH_TOP} ${g.x1 - g.x0} ${GLYPH_U}`}
      style={{ width: `${((g.x1 - g.x0) / GLYPH_U).toFixed(4)}em` }}
      aria-hidden="true"
    >
      <g transform={LOGO_TRANSFORM}>
        {g.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  )
}

function LogoLayer({ d, color }) {
  return (
    <g transform={LOGO_TRANSFORM} fill={color}>
      <path d={d} stroke={color} strokeWidth={3.6 * INNER_SCALE} strokeLinejoin="round" />
    </g>
  )
}

/**
 * 모바일에서 두 줄로 나눌 자리(몇 번째 단어 뒤)를 고릅니다.
 * 윗줄이 아랫줄보다 조금 짧은 "사다리꼴" 모양(윗줄 ≈ 전체의 40%)이 되도록 합니다.
 * 예: "Seeing How / We Learn Together", "COLLABORATIVE / RESEARCH LEARNING LAB"
 */
function mobileBreak(wordList) {
  const lens = wordList.map((w) => w.length)
  const total = lens.reduce((a, b) => a + b, 0) + lens.length - 1
  let best = -1
  let bestDiff = Infinity
  let first = -1
  for (let i = 0; i < lens.length - 1; i++) {
    first += lens[i] + 1
    const diff = Math.abs(first - total * 0.4)
    if (first < total - first - 1 && diff < bestDiff) {
      best = i
      bestDiff = diff
    }
  }
  return best
}

/** 글자 사이에 모바일에서만 줄바꿈이 되는 자리(<br class="hero-br">)를 넣어 돌려줍니다. */
function withMobileBreak(text) {
  const ws = text.trim().split(/\s+/)
  const at = mobileBreak(ws)
  if (at < 0) return text
  return (
    <>
      {ws.slice(0, at + 1).join(' ')} <br className="hero-br" />
      {ws.slice(at + 1).join(' ')}
    </>
  )
}

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// 단계가 바뀌는 시각(ms) — 앞의 분필 장면(HeroChalk) 뒤에 이어집니다.
const T_INTRO = CHALK_NAME_AT * 1000 // 3700: 이름이 한 번에 나타남
const T_HIGHLIGHT = T_INTRO + 800 // 4500: Co · Re가 금빛으로
const T_FADE = T_HIGHLIGHT + 600 // 5100: 나머지 글자가 사라짐
const T_MERGE = T_FADE + 350 // 5450: Co · Re · Lab이 모임
const MERGE_MS = 1300
const T_DONE = T_MERGE + 1150 // 6600: 완성 — 이어서 학생들이 로고 점으로 모임(6.9s~), 부제 · 모토 · 소속
// 로고 완성 단계: 1) 점 자리 측정 2) 두 학습자 점이 톡 나타남 3) 어깨선이 그려짐
const T_LOGO_MEASURE = T_MERGE + MERGE_MS + 40
const T_LOGO_DOTS = (CONV_AT + 1.0) * 1000
const T_LOGO_CURVE = (CONV_AT + 1.4) * 1000

// 사이트 안에서 홈으로 다시 돌아왔을 때는 인트로를 반복하지 않습니다.
let playedOnce = false

export default function HeroIntro({ labName = '', tagline = '', affiliation = [], motto = '' }) {
  const words = useMemo(() => splitName(tagline, labName), [tagline, labName])
  const [animated] = useState(() => Boolean(words) && !REDUCED && !playedOnce)

  const [phase, setPhase] = useState(animated ? 'chalk' : 'done')
  const nameRef = useRef(null)
  const firstRects = useRef(null)
  const [logoBox, setLogoBox] = useState(null)
  const [logoStage, setLogoStage] = useState(animated ? 0 : 3)

  // 로고의 점·어깨선을 그릴 자리 = 이름 속 "Co" 글자의 왼쪽 위 ~ "Re" 글자의 오른쪽 아래.
  // 글꼴이 늦게 로드되거나 창 크기가 바뀌어도 자리가 어긋나지 않게, 그때마다 다시 잽니다.
  const measure = () => {
    const gl = nameRef.current?.querySelectorAll('.hero-glyph') ?? []
    const host = nameRef.current?.closest('.hero-intro-content')
    if (gl.length < 2 || !host) return
    const hr = host.getBoundingClientRect()
    const a = gl[0].getBoundingClientRect()
    const b = gl[gl.length - 1].getBoundingClientRect()
    if (!a.width) return
    setLogoBox({ left: a.left - hr.left, top: a.top - hr.top, width: b.right - a.left, height: a.height })
  }
  useEffect(() => {
    if (logoStage < 1) return undefined
    measure()
    document.fonts?.ready?.then(measure)
    // 창 크기가 바뀌면 글자 크기가 그대로여도 가운데 정렬 위치가 옮겨지므로, 둘 다 지켜봅니다.
    window.addEventListener('resize', measure)
    let ro = null
    if (typeof ResizeObserver !== 'undefined' && nameRef.current) {
      ro = new ResizeObserver(measure)
      ro.observe(nameRef.current)
    }
    return () => {
      window.removeEventListener('resize', measure)
      if (ro) ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoStage >= 1])

  // 화면이 처음 열릴 때 한 번만 시간표를 잡습니다.
  useEffect(() => {
    if (!animated) return undefined
    const timers = [
      setTimeout(() => setPhase('intro'), T_INTRO),
      setTimeout(() => setPhase('highlight'), T_HIGHLIGHT),
      setTimeout(() => setPhase('fade'), T_FADE),
      setTimeout(() => {
        // 합쳐지기 직전, 남는 글자(Co · Re · Lab)의 현재 자리를 기억해 둡니다.
        const els = nameRef.current?.querySelectorAll('.hero-piece-keep') ?? []
        firstRects.current = Array.from(els, (el) => el.getBoundingClientRect())
        setPhase('merge')
      }, T_MERGE),
      setTimeout(() => {
        playedOnce = true
        setPhase('done')
      }, T_DONE),
      setTimeout(() => setLogoStage(1), T_LOGO_MEASURE),
      setTimeout(() => setLogoStage(2), T_LOGO_DOTS),
      setTimeout(() => setLogoStage(3), T_LOGO_CURVE),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 처음부터 완성된 화면(재방문·동작 줄이기)일 때, 그리고 창 너비가 바뀔 때 여유를 다시 잽니다.
  useLayoutEffect(() => {
    if (phase !== 'done') return undefined
    const sec = nameRef.current?.closest('.hero-intro')
    if (!animated) fitAmbientRoom(sec)
    let w = window.innerWidth
    const onResize = () => {
      if (window.innerWidth === w) return // 휴대폰 주소창이 접히며 높이만 바뀌는 것은 무시
      w = window.innerWidth
      fitAmbientRoom(sec)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'done'])

  // "CoRe Lab" 배치로 바뀐 직후(화면에 그려지기 전), 각 글자를 원래 자리·크기로 되돌려 놓고
  // 새 자리까지 한 번에 부드럽게 미끄러지게 합니다.
  useLayoutEffect(() => {
    if (phase !== 'merge' || !firstRects.current) return
    // 작은 네트워크(HeroAmbient)가 첫 화면에 들어오도록 필요한 만큼만 묶음을 올립니다 — 글자가 모이는 움직임에 함께 섞입니다.
    fitAmbientRoom(nameRef.current?.closest('.hero-intro'))
    const els = nameRef.current?.querySelectorAll('.hero-piece-keep') ?? []
    els.forEach((el, i) => {
      const first = firstRects.current[i]
      const last = el.getBoundingClientRect()
      if (!first || !last.width) return
      const scale = first.width / last.width
      const dx = first.left - last.left
      const dy = first.top - last.top
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
          { transform: 'translate(0px, 0px) scale(1)' },
        ],
        { duration: MERGE_MS, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'backwards' },
      )
    })
    firstRects.current = null
  }, [phase])

  // 소속 문구는 순서대로: 대학교 → 학과(강조) → 지도교수. 정식 이름과 같은 줄은 빼서 두 번 보이지 않게 합니다.
  const lines = affiliation.filter((l) => l && l.trim().toLowerCase() !== tagline.trim().toLowerCase())
  const affClass = (i) => (i === 0 ? 'hero-aff-univ' : i === 1 ? 'hero-aff-dept' : 'hero-aff-line')

  // 모바일: 정식 이름(부제)을 두 줄로 나눌 자리
  const taglineBreak = words ? mobileBreak(words.map((w) => w.pieces.map((p) => p.text).join(''))) : -1

  // 약자의 두 번째 단어("Lab")가 시작되는 조각 앞에는 완성된 뒤 띄어쓰기 간격을 줍니다.
  let lastPart = null

  return (
    <section className={`hero-intro hero-phase-${phase}${logoStage >= 2 ? ' hero-logo-dots' : ''}${logoStage >= 3 ? ' hero-logo-curve' : ''}`}>
      <HeroChalk animated={animated} />
      <HeroAmbient animated={animated} />
      <div className="hero-intro-content">
        <h1 className="hero-name" ref={nameRef} aria-label={labName}>
          {words ? (
            words.map((w, wi) => {
              const hasKeep = w.pieces.some((p) => p.keep)
              return (
                <Fragment key={wi}>
                  {/* 단어 하나를 통째로 묶어, 좁은 화면에서도 단어 중간에서 줄이 바뀌지 않게 합니다. */}
                  <span
                    className={`hero-word${hasKeep ? '' : ' hero-word-drop'}`}
                    style={{ '--i': wi }}
                    aria-hidden="true"
                  >
                    {w.pieces.map((p, pi) => {
                      let gap = false
                      if (p.keep) {
                        gap = lastPart !== null && p.part !== lastPart
                        lastPart = p.part
                      }
                      const cls = [
                        'hero-piece',
                        p.keep ? 'hero-piece-keep' : 'hero-piece-drop',
                        p.keep && p.part === 0 ? 'hero-piece-core' : '',
                        gap ? 'hero-piece-gap' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <span key={pi} className={cls}>
                          {p.keep && p.part === 0 ? <Glyph text={p.text} /> : p.text}
                        </span>
                      )
                    })}
                  </span>
                  {wi < words.length - 1 && (
                    <span className="hero-space" aria-hidden="true">
                      {' '}
                    </span>
                  )}
                </Fragment>
              )
            })
          ) : (
            <span className="hero-word">
              <span className="hero-piece hero-piece-keep hero-piece-core">{labName}</span>
            </span>
          )}
        </h1>

        {/* 로고의 두 학습자 점 + 어깨선. 이름 속 로고 글자("CoRe") 위에 정확히 겹쳐 그립니다.
            보이지 않는 표식(data-hero-dot)은 칠판의 학생들이 날아올 도착 지점입니다. */}
        {logoBox && (
          <div
            className="hero-logo-overlay"
            style={{ left: logoBox.left, top: logoBox.top, width: logoBox.width, height: logoBox.height }}
            aria-hidden="true"
          >
            <svg viewBox={`${OVERLAY_X0} ${GLYPH_TOP} ${OVERLAY_X1 - OVERLAY_X0} ${GLYPH_U}`}>
              <defs>
                <clipPath id="hero-logo-reveal">
                  <rect className="hero-logo-clip" x="540" y="250" height="300" width="0" />
                </clipPath>
              </defs>
              <g clipPath="url(#hero-logo-reveal)">
                <LogoLayer d={CURVE} color={DOT_B_COLOR} />
              </g>
              <g className="hero-logo-dot hero-logo-dot-a">
                <LogoLayer d={DOT_A} color={DOT_A_COLOR} />
              </g>
              <g className="hero-logo-dot hero-logo-dot-b">
                <LogoLayer d={DOT_B} color={DOT_B_COLOR} />
              </g>
              <circle data-hero-dot="a" cx={DOT_A_C.x} cy={DOT_A_C.y} r="33" fill="none" />
              <circle data-hero-dot="b" cx={DOT_B_C.x} cy={DOT_B_C.y} r="33" fill="none" />
            </svg>
          </div>
        )}

        <div className="hero-rule" aria-hidden="true" />

        <div className="hero-after">
          {tagline && (
            <p className="hero-tagline">
              {words
                ? words.map((w, wi) => (
                    <Fragment key={wi}>
                      {wi > 0 && wi === taglineBreak + 1 && <br className="hero-br" />}
                      {w.pieces.map((p, pi) =>
                        p.keep && p.part === 0 ? (
                          <span key={pi} className="hero-tagline-core">
                            {p.text}
                          </span>
                        ) : (
                          <Fragment key={pi}>{p.text}</Fragment>
                        ),
                      )}
                      {wi < words.length - 1 && ' '}
                    </Fragment>
                  ))
                : tagline}
            </p>
          )}
          {motto && <p className="hero-motto">{withMobileBreak(motto)}</p>}
          {lines.length > 0 && (
            <div className="hero-affiliation">
              {lines.map((line, i) => (
                <p key={i} className={affClass(i)}>
                  {i === 1 ? withMobileBreak(line) : line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
