import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import HeroChalk, { CHALK_NAME_AT } from './HeroChalk'

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
 *  5) done      : 정식 이름(작게, CO·RE 금색) → 모토 → 소속(대학교 · 학과 · 지도교수)이 차례로 등장
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

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// 단계가 바뀌는 시각(ms) — 앞의 분필 장면(HeroChalk) 뒤에 이어집니다.
const T_INTRO = CHALK_NAME_AT * 1000 // 4300: 이름이 한 번에 나타남
const T_HIGHLIGHT = T_INTRO + 1250 // Co · Re가 금빛으로
const T_FADE = T_HIGHLIGHT + 1000 // 나머지 글자가 사라짐
const T_MERGE = T_FADE + 550 // Co · Re · Lab이 천천히 모임
const MERGE_MS = 2300
const T_DONE = T_MERGE + 1800 // 부제 · 모토 · 소속이 천천히 차례로

// 사이트 안에서 홈으로 다시 돌아왔을 때는 인트로를 반복하지 않습니다.
let playedOnce = false

export default function HeroIntro({ labName = '', tagline = '', affiliation = [], motto = '' }) {
  const words = useMemo(() => splitName(tagline, labName), [tagline, labName])
  const [animated] = useState(() => Boolean(words) && !REDUCED && !playedOnce)

  const [phase, setPhase] = useState(animated ? 'chalk' : 'done')
  const nameRef = useRef(null)
  const firstRects = useRef(null)

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
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "CoRe Lab" 배치로 바뀐 직후(화면에 그려지기 전), 각 글자를 원래 자리·크기로 되돌려 놓고
  // 새 자리까지 한 번에 부드럽게 미끄러지게 합니다.
  useLayoutEffect(() => {
    if (phase !== 'merge' || !firstRects.current) return
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
        { duration: MERGE_MS, easing: 'cubic-bezier(0.45, 0, 0.15, 1)', fill: 'backwards' },
      )
    })
    firstRects.current = null
  }, [phase])

  // 소속 문구는 순서대로: 대학교 → 학과(강조) → 지도교수. 정식 이름과 같은 줄은 빼서 두 번 보이지 않게 합니다.
  const lines = affiliation.filter((l) => l && l.trim().toLowerCase() !== tagline.trim().toLowerCase())
  const affClass = (i) => (i === 0 ? 'hero-aff-univ' : i === 1 ? 'hero-aff-dept' : 'hero-aff-line')

  // 약자의 두 번째 단어("Lab")가 시작되는 조각 앞에는 완성된 뒤 띄어쓰기 간격을 줍니다.
  let lastPart = null

  return (
    <section className={`hero-intro hero-phase-${phase}`}>
      <HeroChalk animated={animated} />
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
                          {p.text}
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

        <div className="hero-rule" aria-hidden="true" />

        <div className="hero-after">
          {tagline && (
            <p className="hero-tagline">
              {words
                ? words.map((w, wi) => (
                    <Fragment key={wi}>
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
          {motto && <p className="hero-motto">{motto}</p>}
          {lines.length > 0 && (
            <div className="hero-affiliation">
              {lines.map((line, i) => (
                <p key={i} className={affClass(i)}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
