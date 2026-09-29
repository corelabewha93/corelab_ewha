import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/**
 * 메인 화면 인트로 — "CoRe"가 Collaborative Research에서 왔다는 걸 보여주는 모션.
 *
 *  1) intro     : 정식 이름이 한 단어씩 세로로 쌓이며 등장
 *                   Collaborative / Research / Learning / Lab
 *                 (세로로 쌓으면 Co · Re가 왼쪽 끝에 나란히 서서 "머리글자"라는 게 한눈에 보입니다)
 *  2) highlight : Co · Re가 금색으로 켜지고 밑줄이 그어지며, 나머지 글자는 옅어짐
 *  3) fade      : 약자에 쓰이지 않는 글자가 사라짐
 *  4) mark      : 남은 Co · Re · Lab 글자가 그 자리에서 실제로 날아와 한 줄 "CoRe Lab"으로 합쳐짐
 *  5) done      : 정식 이름(작게, CO·RE 금색) · 모토 · 소속이 차례로 등장
 *
 * - tagline(site.json의 labTagline)과 labName(site.json의 labName)을 보고 남길 글자를 자동으로 찾습니다.
 *   관리자 화면에서 이름을 바꿔도 코드를 고칠 필요가 없습니다.
 * - 약자를 정식 이름에서 찾지 못하면(철자가 안 맞으면) 모션 없이 완성된 화면을 보여줍니다.
 * - "동작 줄이기"를 켜 둔 기기에서는 처음부터 완성된 화면을 보여줍니다.
 */

/** 약자(target)의 글자들을 정식 이름의 단어 앞부분에서 순서대로 찾아 짝지어줍니다. */
function matchWords(words, target) {
  function solve(wi, ti) {
    if (ti === target.length) return []
    if (wi === words.length) return null
    const w = words[wi]
    let k = 0
    while (k < w.length && ti + k < target.length && w[k] === target[ti + k]) k++
    for (let len = k; len >= 1; len--) {
      const rest = solve(wi + 1, ti + len)
      if (rest) return [{ wi, len }, ...rest]
    }
    return solve(wi + 1, ti) // 이 단어는 통째로 사라지는 단어로
  }
  return solve(0, 0)
}

/**
 * 정식 이름을 단어별 조각으로 나눕니다.
 * 반환: [{ pieces: [{ text, keep, part, gap }] }]
 *   keep : 약자에 남는 글자인지
 *   part : 약자에서 몇 번째 단어인지 (0 = "CoRe", 1 = "Lab")
 *   gap  : 완성된 약자에서 이 조각 앞에 띄어쓰기가 오는지 ("Lab" 앞)
 */
export function splitName(tagline = '', labName = '') {
  const words = tagline.trim().split(/\s+/).filter(Boolean)
  const parts = labName.trim().split(/\s+/).filter(Boolean)
  const target = parts.join('')
  if (!words.length || !target) return null

  const matches = matchWords(words, target)
  if (!matches) return null

  const partOf = []
  const partStart = []
  parts.forEach((p, pi) => {
    for (let i = 0; i < p.length; i++) {
      partOf.push(pi)
      partStart.push(i === 0 && pi > 0)
    }
  })

  const byWord = new Map(matches.map((m) => [m.wi, m.len]))
  let ti = 0
  return words.map((w, wi) => {
    const len = byWord.get(wi) ?? 0
    const pieces = []
    if (len > 0) {
      pieces.push({ text: w.slice(0, len), keep: true, part: partOf[ti], gap: partStart[ti] })
      if (w.length > len) pieces.push({ text: w.slice(len), keep: false })
      ti += len
    } else {
      pieces.push({ text: w, keep: false })
    }
    return { pieces }
  })
}

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// 단계별 시작 시각(ms)
const T_HIGHLIGHT = 1500
const T_FADE = 2700
const T_MARK = 3050
const MOVE_MS = 950
const T_DONE = T_MARK + MOVE_MS - 150

export default function HeroIntro({ labName = '', tagline = '', affiliation = [], motto = '' }) {
  const words = useMemo(() => splitName(tagline, labName), [tagline, labName])
  const animated = Boolean(words) && !REDUCED

  const [phase, setPhase] = useState(animated ? 'intro' : 'done')
  const nameRef = useRef(null)
  const firstRects = useRef(null)

  // 처음 열릴 때 한 번만 시간표를 잡습니다.
  useEffect(() => {
    if (!animated) return undefined
    const timers = [
      setTimeout(() => setPhase('highlight'), T_HIGHLIGHT),
      setTimeout(() => setPhase('fade'), T_FADE),
      setTimeout(() => {
        // 글자들이 "세로로 쌓인 자리"를 기억해 둔 뒤 한 줄 배치로 바꿉니다 (FLIP 애니메이션).
        const els = nameRef.current?.querySelectorAll('.hero-piece-keep') ?? []
        firstRects.current = Array.from(els, (el) => el.getBoundingClientRect())
        setPhase('mark')
      }, T_MARK),
      setTimeout(() => setPhase('done'), T_DONE),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 한 줄 배치로 바뀐 직후(화면에 그려지기 전)에, 각 글자를 원래 자리로 되돌린 상태에서
  // 새 자리까지 부드럽게 이동시킵니다. → Co · Re · Lab이 실제로 날아와 합쳐지는 것처럼 보입니다.
  useLayoutEffect(() => {
    if (phase !== 'mark' || !firstRects.current) return
    const els = nameRef.current?.querySelectorAll('.hero-piece-keep') ?? []
    els.forEach((el, i) => {
      const first = firstRects.current[i]
      if (!first) return
      const last = el.getBoundingClientRect()
      if (!last.width) return
      const scale = first.width / last.width
      const dx = first.left - last.left
      const dy = first.top - last.top
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: 'translate(0, 0) scale(1)' }],
        { duration: MOVE_MS, easing: 'cubic-bezier(0.65, 0, 0.2, 1)', delay: i * 45, fill: 'backwards' },
      )
    })
    firstRects.current = null
  }, [phase])

  // 정식 이름과 같은 줄은 아래 소속 문구에서 빼서 두 번 보이지 않게 합니다.
  const lines = affiliation.filter((l) => l && l.trim().toLowerCase() !== tagline.trim().toLowerCase())

  return (
    <section className={`hero-intro hero-phase-${phase}`}>
      <div className="hero-intro-content">
        <h1 className="hero-name" ref={nameRef} aria-label={labName}>
          {words ? (
            words.map((w, wi) => {
              const hasKeep = w.pieces.some((p) => p.keep)
              return (
                <span
                  key={wi}
                  className={`hero-word${hasKeep ? '' : ' hero-word-drop'}`}
                  style={{ '--w': wi }}
                  aria-hidden="true"
                >
                  {w.pieces.map((p, pi) => (
                    <span
                      key={pi}
                      className={[
                        'hero-piece',
                        p.keep ? 'hero-piece-keep' : 'hero-piece-drop',
                        p.keep && p.part === 0 ? 'hero-piece-core' : '',
                        p.gap ? 'hero-piece-gap' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {p.text}
                    </span>
                  ))}
                </span>
              )
            })
          ) : (
            <span className="hero-word">
              <span className="hero-piece hero-piece-keep hero-piece-core">{labName}</span>
            </span>
          )}
        </h1>

        <div className="hero-rule" aria-hidden="true" />

        <div className="hero-after">
          {tagline && (
            <p className="hero-tagline">
              {words
                ? words.map((w, wi) => (
                    <span key={wi}>
                      {wi > 0 && ' '}
                      {w.pieces.map((p, pi) =>
                        p.keep && p.part === 0 ? (
                          <span key={pi} className="hero-tagline-core">
                            {p.text}
                          </span>
                        ) : (
                          p.text
                        ),
                      )}
                    </span>
                  ))
                : tagline}
            </p>
          )}
          {motto && <p className="hero-motto">{motto}</p>}
          {lines.length > 0 && (
            <div className="hero-affiliation">
              {lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
