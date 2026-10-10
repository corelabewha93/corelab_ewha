import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useData } from '../hooks/useData'

/**
 * 한국어 / 영어 전환.
 *
 * 처음 방문: 브라우저 언어가 한국어면 한국어, 그 밖(해외)이면 영어로 시작합니다.
 * 오른쪽 위 KO · EN 버튼으로 바꾸면 그 선택을 기억합니다(다음 방문에도 유지).
 * 주소 끝에 ?lang=en 을 붙이면 누구나 영어로 바로 열립니다 (학회 발표 QR 코드용).
 *
 * 화면 문구: tr('한국어', 'English') — 지금 언어에 맞는 쪽을 돌려줍니다.
 * 데이터 내용: loc(항목, 구역) — 영어일 때 titleEn → title 처럼 "…En" 칸의 값으로 바꿔 줍니다.
 *   1순위: 관리자가 편집창 "영문" 칸에 적어 저장한 값 (각 데이터 파일 안)
 *   2순위: 처음 한 번 넣어 둔 초벌 번역 (public/data/en.json)
 *   둘 다 없으면 한글 그대로 보여줍니다.
 */

const STORE_KEY = 'corelab-lang'
const LangContext = createContext(null)

function readInitial() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (q === 'en' || q === 'ko') {
      try {
        localStorage.setItem(STORE_KEY, q)
      } catch {
        /* 저장이 막힌 브라우저 */
      }
      return q
    }
  } catch {
    /* noop */
  }
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved === 'en' || saved === 'ko') return saved
  } catch {
    /* noop */
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'ko']
  return langs.some((l) => /^ko\b/i.test(l || '')) ? 'ko' : 'en'
}

const filled = (v) => (Array.isArray(v) ? v.some((x) => String(x ?? '').trim()) : String(v ?? '').trim() !== '')

/** "…En" 칸이 채워져 있으면 그 값을 원래 칸 자리에 넣은 사본을 돌려줍니다. */
export function localize(obj, seed) {
  if (!obj || typeof obj !== 'object') return obj
  const out = { ...obj }
  const keys = new Set([...Object.keys(obj), ...Object.keys(seed ?? {})])
  keys.forEach((k) => {
    if (k.length < 3 || !k.endsWith('En')) return
    const base = k.slice(0, -2)
    const v = filled(obj[k]) ? obj[k] : seed?.[k]
    if (filled(v)) out[base] = v
  })
  return out
}

/** 관리자 편집창 처음 값: 비어 있는 "…En" 칸을 초벌 번역으로 미리 채운 사본 */
export function fillSeed(obj, seed) {
  if (!seed) return obj ?? {}
  const out = { ...(obj ?? {}) }
  Object.keys(seed).forEach((k) => {
    if (k.endsWith('En') && !filled(out[k]) && filled(seed[k])) out[k] = seed[k]
  })
  return out
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(readInitial)
  const { data: pack } = useData('en.json')

  // 주소에 붙은 ?lang= 은 읽은 뒤 지웁니다(주소창을 깔끔하게, 다른 링크에 따라붙지 않게).
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang')
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
      }
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.classList.toggle('lang-en', lang === 'en')
  }, [lang])

  const setLang = useCallback((next) => {
    setLangState(next)
    try {
      localStorage.setItem(STORE_KEY, next)
    } catch {
      /* noop */
    }
  }, [])

  const value = useMemo(() => {
    const en = lang === 'en'
    const tr = (ko, enText) => (en && enText != null ? enText : ko)
    /**
     * section: en.json 안의 구역 이름 (news, people, projects, …). 항목은 id로 찾습니다.
     * 'site'처럼 id가 없는 구역은 구역 자체가 한 항목입니다.
     */
    const seedOf = (obj, section) => {
      if (!pack || !section) return null
      const s = pack[section]
      if (!s) return null
      if (obj && obj.id != null && s[obj.id]) return s[obj.id]
      return obj && obj.id != null ? null : s
    }
    const loc = (obj, section) => (en ? localize(obj, seedOf(obj, section)) : obj)
    return { lang, en, setLang, tr, loc, seedOf, pack }
  }, [lang, setLang, pack])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (ctx) return ctx
  // Provider 밖(테스트 화면 등)에서도 깨지지 않도록 한국어 기본값
  return { lang: 'ko', en: false, setLang: () => {}, tr: (ko) => ko, loc: (o) => o, seedOf: () => null, pack: null }
}

/** 날짜 표기: 영어일 때 "Oct 2026", "Oct 10, 2026" 형태 */
export function formatDateEn(value, withDay = true) {
  if (!value) return value
  const m = String(value).match(/^(\d{4})[.-](\d{1,2})(?:[.-](\d{1,2}))?/)
  if (!m) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mon = months[Number(m[2]) - 1]
  if (!mon) return value
  return m[3] && withDay ? `${mon} ${Number(m[3])}, ${m[1]}` : `${mon} ${m[1]}`
}

/**
 * 사람 이름을 영어 화면에서 영문 이름으로 바꿔 주는 함수 (People의 영어 이름 칸 기준).
 * People에 없는 이름(외부 공동연구자 등)은 그대로 둡니다.
 */
export function useNameEn() {
  const { en, loc, pack } = useLang()
  const { data: people } = useData('people.json')
  return useMemo(() => {
    if (!en) return (n) => n
    const map = new Map()
    ;['faculty', 'students', 'alumni'].forEach((k) =>
      (people?.[k] ?? []).forEach((p) => {
        const v = loc(p, 'people')
        if (p.name && v.name && v.name !== p.name) map.set(p.name.trim(), v.name)
      }),
    )
    // People에 없는 이름(예전 공동연구자 등)은 en.json의 names 목록에서 찾습니다.
    const extra = pack?.names ?? {}
    return (n) => {
      const k = String(n ?? '').trim()
      return map.get(k) ?? extra[k] ?? n
    }
  }, [en, loc, people, pack])
}
