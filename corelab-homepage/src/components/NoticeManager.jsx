import { useRef, useState } from 'react'
import { saveData } from '../admin/dataStore'
import { showToast } from '../admin/toast'
import { useLang } from '../i18n/LangContext'
import { FILE, PALETTE, DEFAULT_TYPES, addDays, statusOf, shortDate, newId, normalizeLink, TYPE_NAME_EN, Slide } from './noticeShared'

/* 관리자 전용 공지 관리 창 — 관리자가 ✎ / + 공지 추가를 눌렀을 때만 내려받습니다(NoticeBanner.jsx) */

export default function NoticeManager({ token, items, types, today, start, onClose }) {
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
