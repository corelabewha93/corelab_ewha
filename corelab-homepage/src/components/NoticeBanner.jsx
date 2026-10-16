import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useHashRoute } from '../router/useHashRoute'
import { useData } from '../admin/dataStore'
import { useAdminAuth } from '../admin/AdminAuthContext'
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

import { FILE, PALETTE, DEFAULT_TYPES, ROTATE_MS, kstToday, statusOf, readDismissed, writeDismissed, dismissKey, TYPE_NAME_EN, Slide } from './noticeShared'

// 관리자 공지 관리 창은 필요할 때만 내려받습니다 (방문자는 받지 않음)
const NoticeManager = lazy(() => import('./NoticeManager'))

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
        <Suspense fallback={null}>
        <NoticeManager
          token={token}
          items={items}
          types={types}
          today={today}
          start={manager}
          onClose={() => setManager(null)}
        />
        </Suspense>
      ) : null}
    </>
  )
}

/* ───────────── 관리자 창: 목록 · 편집 · 종류 관리 ───────────── */
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
