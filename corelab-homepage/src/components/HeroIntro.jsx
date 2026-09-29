import { Fragment, useEffect, useMemo, useState } from 'react'

/**
 * 메인 화면 인트로 — "CoRe"가 COllaborative REsearch에서 왔다는 걸 보여주는 모션.
 *
 *  1) intro     : 정식 이름 "Collaborative Research Learning Lab"이 한 줄로, 글자 하나하나가
 *                 흐릿함 속에서 살짝 떠오르며 왼쪽에서 오른쪽으로 차례로 나타남
 *  2) highlight : Co · Re가 금빛으로 켜지며 은은하게 커졌다 돌아오고, 나머지 글자는 옅어짐
 *  3) collapse  : 옅어진 글자들이 접혀 사라지고, 남은 Co · Re · Lab이 서로 다가와 "CoRe Lab"이 됨
 *  4) done      : 정식 이름(작게, CO·RE 금색) → 모토 → 소속(대학교 · 학과 · 지도교수)이 차례로 등장
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

// 단계가 바뀌는 시각(ms) — 글자가 모두 나타난 뒤 → 강조 → 접힘 → 완성
const T_HIGHLIGHT = 2000
const T_COLLAPSE = 3400
const T_DONE = T_COLLAPSE + 1150

export default function HeroIntro({ labName = '', tagline = '', affiliation = [], motto = '' }) {
  const words = useMemo(() => splitName(tagline, labName), [tagline, labName])
  const animated = Boolean(words) && !REDUCED

  const [phase, setPhase] = useState(animated ? 'intro' : 'done')

  // 화면이 처음 열릴 때 한 번만 시간표를 잡습니다.
  useEffect(() => {
    if (!animated) return undefined
    const timers = [
      setTimeout(() => setPhase('highlight'), T_HIGHLIGHT),
      setTimeout(() => setPhase('collapse'), T_COLLAPSE),
      setTimeout(() => setPhase('done'), T_DONE),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 소속 문구는 순서대로: 대학교 → 학과(강조) → 지도교수. 정식 이름과 같은 줄은 빼서 두 번 보이지 않게 합니다.
  const lines = affiliation.filter((l) => l && l.trim().toLowerCase() !== tagline.trim().toLowerCase())
  const affClass = (i) => (i === 0 ? 'hero-aff-univ' : i === 1 ? 'hero-aff-dept' : 'hero-aff-line')

  // 글자마다 번호(--c)를 붙여, 왼쪽부터 차례로 나타나게 합니다.
  let charIndex = 0

  return (
    <section className={`hero-intro hero-phase-${phase}`}>
      <div className="hero-intro-content">
        <h1 className="hero-name" aria-label={labName}>
          {words ? (
            words.map((w, wi) => (
              <Fragment key={wi}>
                {/* 단어 하나를 통째로 묶어, 좁은 화면에서도 단어 중간에서 줄이 바뀌지 않게 합니다. */}
                <span className="hero-word" aria-hidden="true">
                  {w.pieces.map((p, pi) => (
                    <span
                      key={pi}
                      className={`hero-seg ${p.keep ? 'hero-seg-keep' : 'hero-seg-drop'}${p.keep && p.part === 0 ? ' hero-seg-core' : ''}`}
                    >
                      {Array.from(p.text).map((ch, k) => (
                        <span key={k} className="hero-ch" style={{ '--c': charIndex++ }}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
                {wi < words.length - 1 && (
                  <span className={`hero-seg hero-space ${w.keepSpace ? 'hero-seg-keep' : 'hero-seg-drop'}`} aria-hidden="true">
                    {' '}
                  </span>
                )}
              </Fragment>
            ))
          ) : (
            <span className="hero-seg hero-seg-keep hero-seg-core">{labName}</span>
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
