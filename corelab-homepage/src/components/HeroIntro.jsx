import { useEffect, useMemo, useState } from 'react'

/**
 * 메인 화면 인트로 — 연구실 정식 이름이 먼저 뜨고, "CoRe Lab"에 쓰이지 않는 글자들이
 * 남는 글자 속으로 스르륵 빨려 들어가며 약자 "CoRe Lab"이 완성되는 모션.
 *
 * - tagline(정식 이름, site.json의 labTagline)과 labName(약자, site.json의 labName)을 보고
 *   어떤 글자를 남길지 자동으로 계산합니다. 예:
 *     "Collaborative Research Learning Lab" + "CoRe Lab"
 *     → [Co]llaborative [Re]search Learning [Lab]
 *   이름을 관리자 화면에서 바꿔도 다시 계산되므로 코드를 고칠 필요가 없습니다.
 * - 약자를 정식 이름 안에서 찾지 못하면(철자가 안 맞는 경우) 모션 없이 약자만 보여줍니다.
 * - 사용자가 "동작 줄이기"를 켜 둔 기기에서는 처음부터 완성된 화면을 보여줍니다.
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
 * 정식 이름을 "남는 글자 / 사라지는 글자" 조각으로 나눕니다.
 * 각 조각: { text, keep, part } — part는 약자에서 몇 번째 단어에 속하는지 (0 = "CoRe", 1 = "Lab").
 */
export function segmentTagline(tagline = '', labName = '') {
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
  const segs = []
  let ti = 0
  const push = (text, keep, part = null) => {
    if (!text) return
    const last = segs[segs.length - 1]
    if (last && last.keep === keep && last.part === part) last.text += text
    else segs.push({ text, keep, part })
  }

  words.forEach((w, wi) => {
    const len = byWord.get(wi) ?? 0
    if (len > 0) {
      push(w.slice(0, len), true, partOf[ti])
      push(w.slice(len), false)
      ti += len
    } else {
      push(w, false)
    }
    if (wi < words.length - 1) {
      // 단어 사이 띄어쓰기: 약자에도 띄어쓰기가 있는 자리면 남기고, 아니면 함께 사라집니다.
      const keepSpace = len > 0 && spaceAfter[ti - 1]
      push(' ', keepSpace, keepSpace ? partOf[ti - 1] : null)
    }
  })
  return segs
}

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function HeroIntro({ labName = '', tagline = '', affiliation = [], motto = '' }) {
  const segments = useMemo(() => segmentTagline(tagline, labName), [tagline, labName])

  // 단계: full(정식 이름) → collapse(글자 빨려 들어감) → done(완성 + 나머지 문구 등장)
  const [phase, setPhase] = useState(REDUCED || !segments ? 'done' : 'full')

  // 화면이 처음 열릴 때 한 번만 시간표를 잡습니다. (정식 이름 2초 → 1.1초 동안 빨려 들어감 → 완성)
  useEffect(() => {
    if (REDUCED || !segments) return undefined
    const t1 = setTimeout(() => setPhase('collapse'), 2000)
    const t2 = setTimeout(() => setPhase('done'), 2000 + 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 정식 이름과 같은 줄은 아래 소속 문구에서 빼서 두 번 보이지 않게 합니다.
  const lines = affiliation.filter((l) => l && l.trim().toLowerCase() !== tagline.trim().toLowerCase())

  return (
    <section className={`hero-intro hero-phase-${phase}`}>
      <div className="hero-intro-content">
        <h1 className="hero-name" aria-label={labName}>
          {segments ? (
            segments.map((s, i) => (
              <span
                key={i}
                className={`hero-seg ${s.keep ? 'hero-seg-keep' : 'hero-seg-drop'}${s.keep && s.part === 0 ? ' hero-seg-core' : ''}`}
                style={!s.keep ? { '--i': i } : undefined}
                aria-hidden={!s.keep || undefined}
              >
                {s.text}
              </span>
            ))
          ) : (
            <span className="hero-seg hero-seg-keep hero-seg-core">{labName}</span>
          )}
        </h1>

        <div className="hero-rule" aria-hidden="true" />

        <div className="hero-after">
          {tagline && <p className="hero-tagline">{tagline}</p>}
          {lines.length > 0 && (
            <div className="hero-affiliation">
              {lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {motto && <p className="hero-motto">{motto}</p>}
    </section>
  )
}
