import Link from '../router/Link'
import { useLang } from '../i18n/LangContext'

/* 공지 띠(NoticeBanner)와 관리자용 공지 관리 창(NoticeManager)이 함께 쓰는 값·도구들 */

export const FILE = 'announcements.json'

// 띠 색 팔레트: bg(왼쪽·가운데 색), tx(글자), chip(이름표·버튼 바탕), chipTx(이름표 글자)
export const PALETTE = {
  gold: { label: '금색', bg: ['#d8c264', '#f3e8ae'], tx: '#0b3d2a', chip: '#0b4a30', chipTx: '#f3e8ae' },
  coral: { label: '코랄', bg: ['#f0a597', '#fbd2c8'], tx: '#5a1a1a', chip: '#8c2a2a', chipTx: '#ffe3dc' },
  mint: { label: '민트', bg: ['#8fdcc9', '#c6f3e6'], tx: '#0b3d3a', chip: '#0b5a54', chipTx: '#d9fbf3' },
  lavender: { label: '연보라', bg: ['#b9a8ec', '#e3dbfa'], tx: '#2e1d5e', chip: '#4a2f94', chipTx: '#efe9ff' },
  sky: { label: '하늘', bg: ['#8cc4eb', '#cde6fa'], tx: '#0e2f4d', chip: '#1d5a8f', chipTx: '#e3f2ff' },
  pink: { label: '분홍', bg: ['#f4acc8', '#fcd7e8'], tx: '#5a1a38', chip: '#a02d63', chipTx: '#ffe6f1' },
  green: { label: '짙은 초록', bg: ['#0b4a30', '#17694a'], tx: '#f3e8ae', chip: '#f3e8ae', chipTx: '#0b3d2a' },
}

export const DEFAULT_TYPES = [
  { id: 'gen', name: '공지', color: 'gold' },
  { id: 'imp', name: '중요', color: 'coral' },
  { id: 'rec', name: '모집', color: 'mint' },
  { id: 'evt', name: '행사', color: 'lavender' },
]

export const ROTATE_MS = 5000

/* ───────────── 날짜 · 보관 도우미 ───────────── */
export function kstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function statusOf(it, today) {
  if (it.start && it.start > today) return 'soon'
  if (it.end && it.end < today) return 'done'
  return 'live'
}
export function shortDate(s) {
  if (!s) return ''
  const [, m, d] = s.split('-')
  return `${Number(m)}/${Number(d)}`
}

export const DISMISS_KEY = 'corelab-notice-dismissed'
let dismissMemory = {}
export function readDismissed(today) {
  let map = {}
  try {
    map = JSON.parse(window.localStorage.getItem(DISMISS_KEY) || '{}') || {}
  } catch {
    map = dismissMemory
  }
  const fresh = {}
  Object.keys(map).forEach((k) => {
    if (map[k] === today) fresh[k] = today // 지난 날짜 기록은 버립니다.
  })
  return fresh
}
export function writeDismissed(map) {
  dismissMemory = map
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
  } catch {
    /* 저장이 안 되는 브라우저에서는 이번 방문 동안만 기억합니다. */
  }
}
export function dismissKey(it) {
  const s = `${it.id}|${it.type}|${it.text}|${it.link || ''}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return `${it.id}:${h}`
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export function normalizeLink(raw) {
  const v = (raw || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v) || v.startsWith('/')) return v
  if (/^www\./i.test(v) || v.includes('.')) return `https://${v}`
  return `/${v}`
}

/* ───────────── 띠 한 장 (방문자 화면 · 편집 미리보기 공용) ───────────── */
// 영어 화면에서 종류 이름표: 관리자가 적은 영문 이름 → 초벌 번역 → 아래 기본 번역 → 한글 그대로
export const TYPE_NAME_EN = { 공지: 'Notice', 중요: 'Important', 모집: 'Recruiting', 행사: 'Event', 일정: 'Schedule', 안내: 'Info', 소식: 'News' }

export function Slide({ item, type, on, preview = false }) {
  const { tr } = useLang()
  const pal = PALETTE[type?.color] || PALETTE.gold
  const style = {
    '--nb-bg0': pal.bg[0],
    '--nb-bg1': pal.bg[1],
    '--nb-tx': pal.tx,
    '--nb-chip': pal.chip,
    '--nb-chip-tx': pal.chipTx,
  }
  const hasLink = Boolean(item.link) && !preview
  const inner = (
    <>
      {type?.name ? <span className="nb-chip">{type.name}</span> : null}
      <span className="nb-text">{item.text}</span>
      {hasLink ? <span className="nb-more">{tr('자세히 ›', 'More ›')}</span> : null}
    </>
  )
  const external = hasLink && /^https?:\/\//i.test(item.link)
  return (
    <div className={`nb-slide${on ? ' on' : ''}`} style={style} aria-hidden={on ? undefined : true}>
      <div className="nb-bg" />
      {hasLink ? (
        external ? (
          <a className="nb-row" href={item.link} target="_blank" rel="noopener noreferrer" tabIndex={on ? 0 : -1}>
            {inner}
          </a>
        ) : (
          <Link className="nb-row" to={item.link} tabIndex={on ? 0 : -1}>
            {inner}
          </Link>
        )
      ) : (
        <div className="nb-row">{inner}</div>
      )}
    </div>
  )
}

/* ───────────── 홈에서만 보이는 띠 ───────────── */
