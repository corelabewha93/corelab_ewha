import { useEffect, useMemo, useRef, useState } from 'react'
import Link from '../router/Link'
import { useHashRoute } from '../router/useHashRoute'
import { useData, saveData } from '../admin/dataStore'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { showToast } from '../admin/toast'
import { useLang } from '../i18n/LangContext'

/**
 * 공지 띠 배너 (홈 화면 맨 위)
 *
 * - public/data/announcements.json 의 공지 중 "오늘(한국 시간)이 시작일~종료일 사이"인 것만 보입니다.
 *   기간이 지나면 코드 수정 없이 저절로 사라집니다.
 * - 공지가 여러 개면 5초마다 한 줄씩 부드럽게 바뀌고, 아래 작은 점으로 몇 번째인지 보여줍니다.
 * - 링크를 넣은 공지는 띠 전체를 누르면 이동합니다.
 * - 방문자는 × 로 닫을 수 있고, 같은 공지는 그날 다시 뜨지 않습니다(문구를 고치거나 새 공지가 오르면 다시 보임).
 * - 관리자(로그인)는 ✎ 로 이 자리에서 바로 공지를 고치고, 공지가 없을 때는 "+ 공지 추가"가 보입니다.
 *   종류 이름과 색도 "종류 관리"에서 마음대로 바꿀 수 있습니다.
 * - 움직임 줄이기 설정을 쓰는 분께는 서서히 바뀌는 효과·반짝임 없이 바로 바뀝니다.
 */

const FILE = 'announcements.json'

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

const DEFAULT_TYPES = [
  { id: 'gen', name: '공지', color: 'gold' },
  { id: 'imp', name: '중요', color: 'coral' },
  { id: 'rec', name: '모집', color: 'mint' },
  { id: 'evt', name: '행사', color: 'lavender' },
]

const ROTATE_MS = 5000

/* ───────────── 날짜 · 보관 도우미 ───────────── */
function kstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function statusOf(it, today) {
  if (it.start && it.start > today) return 'soon'
  if (it.end && it.end < today) return 'done'
  return 'live'
}
function shortDate(s) {
  if (!s) return ''
  const [, m, d] = s.split('-')
  return `${Number(m)}/${Number(d)}`
}

const DISMISS_KEY = 'corelab-notice-dismissed'
let dismissMemory = {}
function readDismissed(today) {
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
function writeDismissed(map) {
  dismissMemory = map
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
  } catch {
    /* 저장이 안 되는 브라우저에서는 이번 방문 동안만 기억합니다. */
  }
}
function dismissKey(it) {
  const s = `${it.id}|${it.type}|${it.text}|${it.link || ''}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return `${it.id}:${h}`
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

function normalizeLink(raw) {
  const v = (raw || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v) || v.startsWith('/')) return v
  if (/^www\./i.test(v) || v.includes('.')) return `https://${v}`
  return `/${v}`
}

/* ───────────── 띠 한 장 (방문자 화면 · 편집 미리보기 공용) ───────────── */
// 영어 화면에서 종류 이름표: 관리자가 적은 영문 이름 → 초벌 번역 → 아래 기본 번역 → 한글 그대로
const TYPE_NAME_EN = { 공지: 'Notice', 중요: 'Important', 모집: 'Recruiting', 행사: 'Event', 일정: 'Schedule', 안내: 'Info', 소식: 'News' }

function Slide({ item, type, on, preview = false }) {
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
function NoticeBannerHome() {
  const { isAdmin, token } = useAdminAuth()
  const { en, tr, loc } = useLang()
  const viewType = (t) => {
    if (!en || !t) return t
    const v = loc(t, 'announcementTypes')
    return v.name !== t.name ? v : { ...t, name: TYPE_NAME_EN[(t.name || '').trim()] ?? t.name }
  }
  const { data } = useData(FILE)
  const [today, setToday] = useState(kstToday)
  const [tick, setTick] = useState(0)
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [manager, setManager] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setToday(kstToday()), 60000)
    return () => clearInterval(t)
  }, [])

  const types = useMemo(() => (Array.isArray(data?.types) && data.types.length ? data.types : DEFAULT_TYPES), [data])
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data])
  const typeOf = (id) => types.find((t) => t.id === id) || types[0]

  const visible = useMemo(() => {
    const dismissed = isAdmin ? {} : readDismissed(today)
    return items.filter(
      (it) => it && it.text && statusOf(it, today) === 'live' && !dismissed[dismissKey(it)],
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, today, isAdmin, tick])

  const n = visible.length
  const cur = n ? idx % n : 0

  useEffect(() => {
    if (n < 2 || paused) return undefined
    const t = setInterval(() => setIdx((i) => i + 1), ROTATE_MS)
    return () => clearInterval(t)
  }, [n, paused])

  const dismiss = () => {
    const it = visible[cur]
    if (!it) return
    const map = readDismissed(today)
    map[dismissKey(it)] = today
    writeDismissed(map)
    setTick((v) => v + 1)
  }

  const showBand = n > 0
  if (!showBand && !isAdmin) return null

  const first = visible[cur]
  const curPal = first ? PALETTE[typeOf(first.type)?.color] || PALETTE.gold : PALETTE.gold

  return (
    <>
      <style>{CSS}</style>
      {showBand ? (
        <div
          className={`nb${n > 1 ? ' multi' : ''}${isAdmin ? ' admin' : ''}`}
          role="region"
          aria-label={tr('공지', 'Announcements')}
          style={{ color: curPal.tx }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="nb-stack">
            {visible.map((it, i) => (
              <Slide key={it.id} item={loc(it, 'announcements')} type={viewType(typeOf(it.type))} on={i === cur} />
            ))}
          </div>
          <div className="nb-tools">
            {isAdmin ? (
              <button
                type="button"
                className="nb-tool nb-pen"
                aria-label="공지 수정"
                title="공지 수정"
                onClick={() => setManager({ view: 'edit', editId: first?.id })}
              >
                ✎
              </button>
            ) : (
              <button type="button" className="nb-tool nb-x" aria-label={tr('공지 닫기', 'Dismiss')} onClick={dismiss}>
                ×
              </button>
            )}
          </div>
          {n > 1 ? (
            <div className="nb-dots">
              {visible.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  className={i === cur ? 'on' : ''}
                  aria-label={tr(`${i + 1}번째 공지 보기`, `Show announcement ${i + 1}`)}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <button type="button" className="nb-add" onClick={() => setManager({ view: 'edit', editId: null })}>
          + 공지 추가
        </button>
      )}
      {manager && isAdmin ? (
        <NoticeManager
          token={token}
          items={items}
          types={types}
          today={today}
          start={manager}
          onClose={() => setManager(null)}
        />
      ) : null}
    </>
  )
}

/* ───────────── 관리자 창: 목록 · 편집 · 종류 관리 ───────────── */
function NoticeManager({ token, items, types, today, start, onClose }) {
  const [view, setView] = useState(start.view) // list | edit | types
  const [editId, setEditId] = useState(start.editId ?? null)
  const [from, setFrom] = useState(start.view === 'edit' ? 'edit' : 'list') // 종류 관리에서 돌아갈 화면
  const [editShown, setEditShown] = useState(start.view === 'edit') // 편집 화면은 한 번 열면 계속 유지(종류 관리에 다녀와도 입력한 내용 보존)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const goto = (v) => {
    setError('')
    if (v === 'edit') setEditShown(true)
    setView(v)
  }
  const typeOf = (id) => types.find((t) => t.id === id) || types[0]

  const run = async (fn, okMsg) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      if (okMsg) showToast(okMsg)
      return true
    } catch (err) {
      setError(err?.message || '저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const ensure = (d) => {
    if (!Array.isArray(d.types) || !d.types.length) d.types = DEFAULT_TYPES
    if (!Array.isArray(d.items)) d.items = []
    return d
  }

  return (
    <div className="nb-modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-card modal-card-wide nb-modal" onClick={(e) => e.stopPropagation()}>
        {view === 'list' ? (
          <ListView
            items={items}
            types={types}
            today={today}
            busy={busy}
            error={error}
            typeOf={typeOf}
            onClose={onClose}
            onNew={() => {
              setEditId(null)
              setEditShown(false)
              goto('edit')
            }}
            onEdit={(id) => {
              setEditId(id)
              setEditShown(false)
              goto('edit')
            }}
            onTypes={() => {
              setFrom('list')
              goto('types')
            }}
            onMove={(id, dir) =>
              run(() =>
                saveData(
                  token,
                  FILE,
                  (d) => {
                    ensure(d)
                    const i = d.items.findIndex((x) => x.id === id)
                    const j = i + dir
                    if (i < 0 || j < 0 || j >= d.items.length) return d
                    ;[d.items[i], d.items[j]] = [d.items[j], d.items[i]]
                    return d
                  },
                  '공지 순서 변경',
                ),
              )
            }
          />
        ) : null}
        {editShown ? (
          <div style={{ display: view === 'edit' ? '' : 'none' }}>
          <EditView
            key={editId || 'new'}
            item={items.find((x) => x.id === editId) || null}
            types={types}
            today={today}
            busy={busy}
            error={error}
            onBack={() => {
              setEditShown(false)
              goto('list')
            }}
            onTypes={() => {
              setFrom('edit')
              goto('types')
            }}
            onSave={async (item) => {
              const ok = await run(
                () =>
                  saveData(
                    token,
                    FILE,
                    (d) => {
                      ensure(d)
                      const i = d.items.findIndex((x) => x.id === item.id)
                      if (i >= 0) d.items[i] = { ...d.items[i], ...item }
                      else d.items.push(item)
                      return d
                    },
                    `공지 ${editId ? '수정' : '추가'}: ${item.text.slice(0, 24)}`,
                  ),
                '공지를 저장했어요. 방문자 화면에는 1~2분 안에 반영돼요.',
              )
              if (ok) onClose()
            }}
            onDelete={async (id) => {
              const ok = await run(
                () =>
                  saveData(
                    token,
                    FILE,
                    (d) => {
                      ensure(d)
                      d.items = d.items.filter((x) => x.id !== id)
                      return d
                    },
                    '공지 삭제',
                  ),
                '공지를 삭제했어요.',
              )
              if (ok) onClose()
            }}
          />
          </div>
        ) : null}
        {view === 'types' ? (
          <TypesView
            types={types}
            items={items}
            busy={busy}
            error={error}
            onBack={() => goto(from)}
            onSave={async (next) => {
              const ok = await run(
                () =>
                  saveData(
                    token,
                    FILE,
                    (d) => {
                      ensure(d)
                      d.types = next
                      return d
                    },
                    '공지 종류 수정',
                  ),
                '공지 종류를 저장했어요.',
              )
              if (ok) goto(from)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

function ListView({ items, types, today, busy, error, typeOf, onClose, onNew, onEdit, onTypes, onMove }) {
  const label = { live: '게시 중', soon: '예정', done: '종료' }
  return (
    <>
      <h2 className="modal-title">공지 관리</h2>
      <p className="modal-hint">위에 있는 공지가 먼저 보입니다. 기간이 지난 공지는 방문자에게 자동으로 안 보여요.</p>
      {items.length === 0 ? <p className="nb-empty">아직 공지가 없어요. “새 공지”로 추가해 보세요.</p> : null}
      <ul className="nb-list">
        {items.map((it, i) => {
          const st = statusOf(it, today)
          const t = typeOf(it.type)
          const pal = PALETTE[t?.color] || PALETTE.gold
          return (
            <li key={it.id} className={`nb-li ${st}`}>
              <span className={`nb-st ${st}`}>{label[st]}</span>
              <span className="nb-li-main">
                <span className="nb-li-text">
                  {t?.name ? (
                    <b className="nb-mini-chip" style={{ background: pal.chip, color: pal.chipTx }}>
                      {t.name}
                    </b>
                  ) : null}
                  {it.text}
                </span>
                <span className="nb-li-date">
                  {shortDate(it.start)} ~ {shortDate(it.end)}
                </span>
              </span>
              <span className="nb-li-btns">
                <button type="button" disabled={busy || i === 0} onClick={() => onMove(it.id, -1)} aria-label="위로">
                  ↑
                </button>
                <button type="button" disabled={busy || i === items.length - 1} onClick={() => onMove(it.id, 1)} aria-label="아래로">
                  ↓
                </button>
                <button type="button" disabled={busy} onClick={() => onEdit(it.id)} aria-label="수정">
                  ✎
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      {error ? <p className="modal-error">{error}</p> : null}
      <div className="modal-actions">
        <button type="button" className="modal-btn-secondary" style={{ marginRight: 'auto' }} onClick={onTypes}>
          종류 관리
        </button>
        <button type="button" className="modal-btn-secondary" onClick={onClose}>
          닫기
        </button>
        <button type="button" className="btn-primary" onClick={onNew}>
          + 새 공지
        </button>
      </div>
    </>
  )
}

function EditView({ item, types, today, busy, error, onBack, onTypes, onSave, onDelete }) {
  const isNew = !item
  const [type, setType] = useState(item?.type && types.some((t) => t.id === item.type) ? item.type : types[0].id)
  const [text, setText] = useState(item?.text || '')
  const { seedOf } = useLang()
  const [textEn, setTextEn] = useState(item?.textEn || (item ? seedOf(item, 'announcements')?.textEn : '') || '')
  const [startD, setStartD] = useState(item?.start || today)
  const [endD, setEndD] = useState(item?.end || addDays(today, 7))
  const [link, setLink] = useState(item?.link || '')
  const [localErr, setLocalErr] = useState('')
  const idRef = useRef(item?.id || newId('n'))

  const selType = types.find((t) => t.id === type) || types[0]
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return setLocalErr('공지 문구를 입력해 주세요.')
    if (!startD || !endD) return setLocalErr('보여줄 기간(시작일·종료일)을 입력해 주세요.')
    if (endD < startD) return setLocalErr('종료일이 시작일보다 빨라요.')
    setLocalErr('')
    onSave({
      id: idRef.current,
      type: selType.id,
      text: text.trim().replace(/\s+/g, ' '),
      textEn: textEn.trim().replace(/\s+/g, ' '),
      start: startD,
      end: endD,
      link: normalizeLink(link),
    })
  }

  return (
    <form onSubmit={submit}>
      <h2 className="modal-title">{isNew ? '공지 추가' : '공지 수정'}</h2>
      <div className="nb-preview">
        <div className="nb nb-static">
          <div className="nb-stack">
            <Slide
              item={{ id: 'preview', text: text.trim() || '여기에 공지 문구가 보여요', link }}
              type={selType}
              on
              preview
            />
          </div>
        </div>
      </div>

      <div className="modal-field">
        <span>종류</span>
        <div className="nb-chips">
          {types.map((t) => {
            const pal = PALETTE[t.color] || PALETTE.gold
            const on = t.id === type
            return (
              <button
                key={t.id}
                type="button"
                className={`nb-chipbtn${on ? ' on' : ''}`}
                style={on ? { background: pal.chip, color: pal.chipTx, borderColor: pal.chip } : undefined}
                onClick={() => setType(t.id)}
              >
                {t.name || '(이름 없음)'}
              </button>
            )
          })}
          <button type="button" className="nb-chipbtn nb-chipbtn-gear" onClick={onTypes}>
            ⚙ 종류 관리
          </button>
        </div>
      </div>

      <div className="modal-field">
        <span>문구 *</span>
        <textarea
          className="modal-input modal-textarea"
          rows={2}
          maxLength={120}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예) 2026 가을 정기 랩미팅은 10월 17일(금) 오후 2시에 열려요"
        />
        <p className="field-hint">한두 줄로 짧게 쓰면 가장 보기 좋아요. ({text.length}/120)</p>
      </div>

      <div className="modal-field modal-field-en">
        <span>
          <em className="en-badge">EN</em> 영문 문구 (선택)
        </span>
        <textarea
          className="modal-input modal-textarea"
          rows={2}
          maxLength={160}
          value={textEn}
          onChange={(e) => setTextEn(e.target.value)}
          placeholder="e.g. CoRe Lab research meeting · Oct 16, 3 PM"
        />
        <p className="field-hint">오른쪽 위 EN을 눌러 영어로 볼 때 이 문구가 나와요. 비워두면 영어 화면에서도 한글 문구가 보여요.</p>
      </div>

      <div className="modal-field">
        <span>보여줄 기간 *</span>
        <div className="nb-dates">
          <input type="date" className="modal-input" value={startD} onChange={(e) => setStartD(e.target.value)} />
          <em>~</em>
          <input type="date" className="modal-input" value={endD} onChange={(e) => setEndD(e.target.value)} />
        </div>
        <p className="field-hint">종료일 당일까지 보이고, 다음 날부터 저절로 사라져요.</p>
      </div>

      <div className="modal-field">
        <span>링크 (선택)</span>
        <input
          className="modal-input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="/news 또는 https://..."
        />
        <p className="field-hint">넣으면 띠를 눌렀을 때 이동하고 “자세히 ›”가 붙어요. 사이트 안 페이지는 /news, /lablife 처럼 적어요.</p>
      </div>

      {localErr || error ? <p className="modal-error">{localErr || error}</p> : null}
      <div className="modal-actions">
        {!isNew ? (
          <button
            type="button"
            className="modal-btn-secondary"
            style={{ marginRight: 'auto', color: '#a33' }}
            disabled={busy}
            onClick={() => onDelete(item.id)}
          >
            삭제
          </button>
        ) : null}
        <button type="button" className="modal-btn-secondary" disabled={busy} onClick={onBack}>
          목록
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}

function TypesView({ types, items, busy, error, onBack, onSave }) {
  const { seedOf } = useLang()
  const [draft, setDraft] = useState(() =>
    types.map((t) => ({
      ...t,
      nameEn: t.nameEn || seedOf(t, 'announcementTypes')?.nameEn || TYPE_NAME_EN[(t.name || '').trim()] || '',
    })),
  )
  const [localErr, setLocalErr] = useState('')
  const used = (id) => items.filter((x) => x.type === id).length

  const upd = (i, patch) => setDraft((d) => d.map((t, k) => (k === i ? { ...t, ...patch } : t)))
  const remove = (i) => {
    const t = draft[i]
    const n = used(t.id)
    if (n > 0) return setLocalErr(`“${t.name || '이름 없음'}” 종류를 쓰는 공지가 ${n}개 있어요. 먼저 그 공지의 종류를 바꿔 주세요.`)
    if (draft.length <= 1) return setLocalErr('종류는 최소 1개는 있어야 해요.')
    setLocalErr('')
    setDraft((d) => d.filter((_, k) => k !== i))
  }
  const add = () => {
    setLocalErr('')
    setDraft((d) => [...d, { id: newId('t'), name: '새 종류', color: 'sky' }])
  }
  const save = () => {
    setLocalErr('')
    onSave(
      draft.map((t) => ({
        id: t.id,
        name: t.name.trim().slice(0, 8),
        nameEn: (t.nameEn || '').trim().slice(0, 14),
        color: PALETTE[t.color] ? t.color : 'gold',
      })),
    )
  }

  return (
    <>
      <h2 className="modal-title">공지 종류 관리</h2>
      <p className="modal-hint">이름과 색을 마음대로 바꿀 수 있어요. 이름을 비우면 이름표 없이 문구만 보여요.</p>
      <ul className="nb-types">
        {draft.map((t, i) => {
          const pal = PALETTE[t.color] || PALETTE.gold
          return (
            <li key={t.id}>
              <div className="nb-type-top">
                <input
                  className="modal-input nb-type-name"
                  value={t.name}
                  maxLength={8}
                  placeholder="(이름표 없음)"
                  onChange={(e) => upd(i, { name: e.target.value })}
                />
                <span className="nb-type-prev" style={{ background: `linear-gradient(90deg,${pal.bg[0]},${pal.bg[1]})`, color: pal.tx }}>
                  {t.name ? (
                    <b style={{ background: pal.chip, color: pal.chipTx }}>{t.name}</b>
                  ) : null}
                  <i>공지 문구 예시</i>
                </span>
                <button type="button" className="nb-type-del" onClick={() => remove(i)} aria-label="종류 삭제">
                  ×
                </button>
              </div>
              <div className="nb-type-en">
                <em className="en-badge">EN</em>
                <input
                  className="modal-input"
                  value={t.nameEn || ''}
                  maxLength={14}
                  placeholder="영문 이름 (예: Notice)"
                  onChange={(e) => upd(i, { nameEn: e.target.value })}
                />
              </div>
              <div className="nb-swatches">
                {Object.entries(PALETTE).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    className={t.color === key ? 'on' : ''}
                    title={p.label}
                    aria-label={p.label}
                    onClick={() => upd(i, { color: key })}
                    style={{ background: `linear-gradient(90deg,${p.bg[0]},${p.bg[1]})` }}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      <button type="button" className="nb-addtype" onClick={add} disabled={draft.length >= 8}>
        + 종류 추가
      </button>
      {localErr || error ? <p className="modal-error">{localErr || error}</p> : null}
      <div className="modal-actions">
        <button type="button" className="modal-btn-secondary" disabled={busy} onClick={onBack}>
          돌아가기
        </button>
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </>
  )
}

/* ───────────── 바깥 틀: 홈에서만 ───────────── */
export default function NoticeBanner() {
  const { path } = useHashRoute()
  if (path !== '/') return null
  return <NoticeBannerHome />
}

/* ───────────── 스타일 ───────────── */
const CSS = `
.nb{position:relative;z-index:90;overflow:hidden;font-family:var(--font-sans,system-ui,sans-serif);transition:color .45s;animation:nbIn .5s ease-out both}
.nb.nb-static{animation:none;border-radius:8px}
@keyframes nbIn{from{max-height:0;opacity:0}to{max-height:200px;opacity:1}}
.nb-stack{display:grid}
.nb-slide{grid-area:1/1;position:relative;opacity:0;visibility:hidden;transition:opacity .45s,visibility 0s .45s;pointer-events:none}
.nb-slide.on{opacity:1;visibility:visible;transition:opacity .45s,visibility 0s;pointer-events:auto}
.nb-bg{position:absolute;inset:0;background:linear-gradient(90deg,var(--nb-bg0),var(--nb-bg1) 50%,var(--nb-bg0));overflow:hidden}
.nb-bg::after{content:"";position:absolute;top:0;bottom:0;left:-30%;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-18deg);animation:nbShine 7s ease-in-out 1.2s infinite}
@keyframes nbShine{0%{left:-30%}22%,100%{left:130%}}
.nb-row{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:42px;padding:8px 72px;color:var(--nb-tx);text-decoration:none;font-weight:600;font-size:14.5px;line-height:1.35;text-align:center;word-break:keep-all}
.nb.multi .nb-row{padding-bottom:14px}
@media (hover:hover){a.nb-row:hover .nb-text{text-decoration:underline}}
.nb-chip{flex:none;background:var(--nb-chip);color:var(--nb-chip-tx);font-weight:800;font-size:11.5px;padding:4px 10px;border-radius:999px;letter-spacing:.02em}
.nb-more{flex:none;background:var(--nb-chip);color:var(--nb-chip-tx);font-weight:700;font-size:12px;padding:6px 12px;border-radius:999px;white-space:nowrap}
.nb-tools{position:absolute;top:0;bottom:0;right:10px;display:flex;align-items:center;z-index:2;pointer-events:none}
.nb-tool{pointer-events:auto;border:0;background:transparent;color:inherit;cursor:pointer;font-family:inherit}
.nb-x{font-size:22px;line-height:1;opacity:.65;padding:4px 8px}
.nb-x:hover{opacity:1}
.nb-pen{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.88);border:1px solid rgba(0,0,0,.15);color:#0b4a30;font-size:14px;line-height:1}
.nb-pen:hover{background:#fff}
.nb-dots{position:absolute;left:0;right:0;bottom:2px;display:flex;justify-content:center;gap:2px;z-index:2;pointer-events:none}
.nb-dots button{pointer-events:auto;width:15px;height:13px;padding:0;border:0;background:transparent;cursor:pointer;position:relative}
.nb-dots button::after{content:"";position:absolute;left:5px;top:4px;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.28;transition:opacity .3s}
.nb-dots button.on::after{opacity:.85}
.nb-add{display:block;width:100%;border:0;border-bottom:1px dashed var(--color-accent,#2a7a5a);background:rgba(255,255,255,.7);color:var(--color-primary,#004d2c);font:600 13px/1 var(--font-sans,system-ui,sans-serif);padding:9px 12px;cursor:pointer;position:relative;z-index:90}
.nb-add:hover{background:#fff}
@media (max-width:560px){
 .nb-row{font-size:12.5px;gap:7px;min-height:56px;padding:8px 40px 8px 12px;justify-content:flex-start;text-align:left}
 .nb.multi .nb-row{padding-bottom:16px}
 .nb.admin .nb-row{padding-right:44px}
 .nb-chip{font-size:10.5px;padding:4px 8px}
 .nb-more{font-size:11px;padding:6px 9px}
 .nb-tools{right:4px}
 .nb-static .nb-row{min-height:48px}
}
@media (prefers-reduced-motion:reduce){
 .nb{animation:none}
 .nb-slide,.nb-slide.on{transition:none}
 .nb-bg::after{animation:none;display:none}
}
.nb-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:12px;z-index:120}
.nb-modal{max-height:90vh}
.nb-preview{margin:0 0 var(--space-3,16px);border:1px solid var(--color-border,#ddd);border-radius:8px;overflow:hidden}
.nb-chips{display:flex;gap:6px;flex-wrap:wrap}
.nb-chipbtn{font:700 .78rem/1 inherit;font-family:inherit;padding:.4rem .75rem;border-radius:999px;border:1px solid var(--color-border,#ccc);background:var(--color-bg,#fff);color:var(--color-text-muted,#555);cursor:pointer}
.nb-chipbtn-gear{border-style:dashed}
.nb-dates{display:flex;align-items:center;gap:8px}
.nb-dates em{font-style:normal;color:var(--color-text-muted,#777)}
.nb-dates .modal-input{flex:1;min-width:0}
.nb-empty{color:var(--color-text-muted,#777);font-size:.9rem;margin:.5rem 0 1rem}
.nb-list{list-style:none;margin:0 0 .5rem;padding:0;display:flex;flex-direction:column;gap:6px;max-height:48vh;overflow:auto}
.nb-li{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--color-border,#ddd);border-radius:8px;background:var(--color-bg,#fff)}
.nb-li.done{opacity:.55}
.nb-st{flex:none;font-size:.7rem;font-weight:800;padding:3px 7px;border-radius:999px;background:#e8e8e8;color:#555}
.nb-st.live{background:#d8f1e2;color:#0b5a34}
.nb-st.soon{background:#fdeccb;color:#8a5a00}
.nb-li-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.nb-li-text{font-size:.88rem;color:var(--color-text,#222);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nb-mini-chip{font-size:.68rem;padding:2px 6px;border-radius:999px;margin-right:6px}
.nb-li-date{font-size:.74rem;color:var(--color-text-muted,#777)}
.nb-li-btns{flex:none;display:flex;gap:4px}
.nb-li-btns button{width:28px;height:28px;border-radius:6px;border:1px solid var(--color-border,#ccc);background:var(--color-surface,#fff);cursor:pointer;font-size:.85rem}
.nb-li-btns button:disabled{opacity:.35;cursor:default}
.nb-types{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.nb-type-top{display:flex;align-items:center;gap:8px}
.nb-type-name{flex:0 0 7.5em;width:7.5em}
.nb-type-en{display:flex;align-items:center;gap:6px;margin-top:6px}
.nb-type-en .modal-input{flex:0 0 11em;width:11em;padding-top:4px;padding-bottom:4px;font-size:.82rem}
.nb-type-prev{flex:1;min-width:0;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;font-size:.78rem;font-weight:600;overflow:hidden;white-space:nowrap}
.nb-type-prev b{font-size:.68rem;padding:2px 7px;border-radius:999px}
.nb-type-prev i{font-style:normal;overflow:hidden;text-overflow:ellipsis}
.nb-type-del{flex:none;width:28px;height:28px;border:0;background:transparent;font-size:1.3rem;color:#a33;cursor:pointer}
.nb-swatches{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.nb-swatches button{width:30px;height:22px;border-radius:6px;border:2px solid transparent;cursor:pointer;box-shadow:0 0 0 1px rgba(0,0,0,.18)}
.nb-swatches button.on{border-color:#222;box-shadow:0 0 0 2px #fff inset}
.nb-addtype{margin-top:10px;border:1px dashed var(--color-border,#bbb);background:none;border-radius:8px;padding:.5rem .9rem;font-size:.85rem;color:var(--color-primary,#004d2c);cursor:pointer;font-weight:600}
`
