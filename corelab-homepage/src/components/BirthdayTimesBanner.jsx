import { useEffect, useRef, useState } from 'react'
import { findActiveEvent } from './celebration/events'
import { useLang } from '../i18n/LangContext'
import '../styles/birthday-times.css'

/**
 * 임규연 교수님 생신(2026-11-14) 기념 — Research 탭 위에 하루만 뜨는 얇은 배너.
 * 누르면 제자들이 만든 특별판 신문 'The Kyu Yon Times'(1면 · 2면)를 크게 볼 수 있습니다.
 *
 *  - 한국 시간 2026년 11월 14일 하루만 보입니다 (생신 효과 celebration/events.js 의 날짜를 그대로 따라감).
 *    다음 해에는 신문 속 숫자가 옛것이 되므로 자동으로 다시 나오지 않습니다.
 *  - 미리보기: 주소 뒤에 ?celebrate=birthday  (예: corelab.ewha.ac.kr/research?celebrate=birthday)
 *  - 신문 사진은 public/images/times/ 에 있고, 배너를 눌러 열 때만 불러옵니다.
 *  - 내리고 싶으면 이 배너를 쓰는 Research.jsx 의 <BirthdayTimesBanner /> 한 줄을 지우고, 사진 폴더를 지우면 됩니다.
 */

const YEAR = 2026
const CLOSED_KEY = 'corelab-times-banner-closed'

const PAGES = [
  { file: 'kyu-yon-times-1.jpg', ko: '1면', en: 'Front', alt: 'The Kyu Yon Times 1면' },
  { file: 'kyu-yon-times-2.jpg', ko: '2면', en: 'Page 2', alt: 'The Kyu Yon Times 2면: 코어랩이 걸어온 길' },
]

function kstYear(now = new Date()) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now))
  } catch {
    return now.getFullYear()
  }
}

function isActive(forced) {
  if (forced === 'birthday') return true
  if (forced) return false
  return findActiveEvent(null)?.id === 'birthday' && kstYear() === YEAR
}

function readSession() {
  try {
    return window.sessionStorage.getItem(CLOSED_KEY) === '1'
  } catch {
    return false
  }
}

const imgSrc = (file) => `${import.meta.env.BASE_URL}images/times/${file}`

export default function BirthdayTimesBanner() {
  const { tr } = useLang()
  const forced = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('celebrate')
  const [hidden, setHidden] = useState(() => (forced ? false : readSession()))
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const openBtn = useRef(null)
  const closeBtn = useRef(null)
  const active = typeof window !== 'undefined' && isActive(forced)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    const btn = openBtn.current
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      btn?.focus?.()
    }
  }, [open])

  if (!active || hidden) return null

  const dismiss = () => {
    setHidden(true)
    try {
      window.sessionStorage.setItem(CLOSED_KEY, '1')
    } catch {
      /* 저장이 안 돼도 이번 화면에서만 닫힙니다. */
    }
  }

  const cur = PAGES[page]

  return (
    <>
      <div className="bdt-banner" role="region" aria-label={tr('교수님 생신 특별판 신문', "Professor's birthday special edition")}>
        <span className="bdt-cake" aria-hidden="true">
          🎂
        </span>
        <div className="bdt-text">
          <p className="bdt-line1">{tr('오늘은 임규연 교수님의 생신입니다', "Today is Prof. Kyu Yon Lim's birthday")}</p>
          <p className="bdt-line2">
            <span className="bdt-paper">The Kyu Yon Times</span>
            <span className="bdt-sub">{tr(' — 제자들이 만든 특별판, 열다섯 번의 봄', ' — a special edition from your students')}</span>
          </p>
        </div>
        <button ref={openBtn} type="button" className="bdt-open" onClick={() => setOpen(true)}>
          {tr('신문 보기', 'Read it')}
        </button>
        <button type="button" className="bdt-x" onClick={dismiss} aria-label={tr('배너 닫기', 'Close banner')}>
          ×
        </button>
      </div>

      {open && (
        <div className="bdt-overlay" role="dialog" aria-modal="true" aria-label="The Kyu Yon Times" onClick={() => setOpen(false)}>
          <div className="bdt-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="bdt-bar">
              <div className="bdt-tabs" role="tablist">
                {PAGES.map((p, i) => (
                  <button
                    key={p.file}
                    type="button"
                    role="tab"
                    aria-selected={i === page}
                    className={`bdt-tab${i === page ? ' is-on' : ''}`}
                    onClick={() => setPage(i)}
                  >
                    {tr(p.ko, p.en)}
                  </button>
                ))}
              </div>
              <a className="bdt-zoom" href={imgSrc(cur.file)} target="_blank" rel="noopener noreferrer">
                {tr('크게 보기', 'Full size')}
              </a>
              <button ref={closeBtn} type="button" className="bdt-close" onClick={() => setOpen(false)} aria-label={tr('닫기', 'Close')}>
                ×
              </button>
            </div>
            <div className="bdt-scroll">
              <a href={imgSrc(cur.file)} target="_blank" rel="noopener noreferrer" title={tr('눌러서 원본 크게 보기', 'Open full size')}>
                <img key={cur.file} className="bdt-img" src={imgSrc(cur.file)} alt={cur.alt} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
