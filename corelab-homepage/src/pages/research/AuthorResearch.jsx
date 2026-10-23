import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Publications from './Publications'
import Theses from './Theses'
import Patents from './Patents'
import Projects from './Projects'
import { rosteredMembers } from './studentRoster'
import { makeFocus, includesFocus } from './authorMatch'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { useLang } from '../../i18n/LangContext'

/**
 * "OOO의 연구 실적" — People 페이지에서 들어오는 한 사람의 모아보기 화면.
 * 논문·저역서(저자·옮긴이) · 학위논문 · 특허(발명자)에 이름이 올라간 실적만 모아 보여줍니다.
 * people.json에 적어둔 영문 표기(pubNames)도 같은 사람으로 봅니다.
 */
export default function AuthorResearch({ data, author, onClear, onEdit, onToggleHidden, onToggleExclude }) {
  const { isAdmin } = useAdminAuth()
  const { tr } = useLang()
  const focus = useMemo(() => makeFocus(author.aliases), [author])
  const headRef = useRef(null)
  // 보고 있는 종류: all · journal · conference · book · theses · projects · patents
  // (다른 사람의 모아보기로 바뀌면 자동으로 All로 돌아갑니다)
  const [sel, setSel] = useState({ name: author.name, key: 'all' })
  const view = sel.name === author.name ? sel.key : 'all'
  const setView = (key) => setSel({ name: author.name, key })

  // PC: 이름 머리말은 스크롤해도 제목 아래에 고정됩니다. 그 높이(--author-h)를 알려 주면
  // 연도가 머리말 바로 아래에 붙습니다.
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = headRef.current
    if (!el) return
    const set = () => root.style.setProperty('--author-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--author-h')
    }
  }, [])

  // 모아보기 화면이 열리면 이름이 먼저 보이도록 맨 위로 올립니다.
  // (People 페이지 아래쪽에서 눌러 들어와도 중간부터 보이지 않게)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  // "이 사람의 실적이 아님"으로 표시된 항목(동명이인 등)은 방문자에게 이 사람의 모아보기에서 빠집니다.
  // 관리자에게는 흐리게 남아 있어서 "다시 포함"으로 되돌릴 수 있어요. (전체 목록에는 영향이 없습니다.)
  const isExcluded = (p) => (p.excludeAuthors ?? []).includes(author.name)

  const { pubs, theses, patents, projects } = useMemo(() => {
    const all = data.publications ?? []
    const mine = (p) => includesFocus(p.authors, focus) || includesFocus(p.translators, focus)
    const show = (p) => isAdmin || !(p.excludeAuthors ?? []).includes(author.name)
    return {
      pubs: all.filter((p) => p.type !== 'other' && mine(p) && show(p)),
      theses: all.filter((p) => p.type === 'other' && mine(p) && show(p)),
      patents: (data.patents ?? []).filter((p) => includesFocus(p.inventors, focus) && show(p)),
      // 연구과제: 참여연구진에 이름이 있는 과제. (교수님은 모든 과제의 연구책임자라 따로 표기하지 않습니다.)
      projects: (data.projects ?? []).filter((p) => includesFocus(rosteredMembers(p).map((m) => m.name), focus)),
    }
  }, [data, focus, isAdmin, author.name])

  const toolFor = (dataKey) =>
    isAdmin && onToggleExclude
      ? { name: author.name, isExcluded, onToggle: (item) => onToggleExclude(item, dataKey, author.name) }
      : null

  // 화면에는 건수(숫자)를 표시하지 않습니다. "제외된 항목"을 빼고 0건인지만 판단합니다.
  const counted = (list) => list.filter((p) => !isExcluded(p))

  // 0건인 종류는 요약·목록 모두에서 뺍니다.
  const sections = [
    { key: 'publications', title: 'Publications', shown: pubs.length },
    { key: 'theses', title: 'Dissertations', shown: theses.length },
    { key: 'projects', title: 'Projects', shown: projects.length },
    { key: 'patents', title: 'Patents', shown: patents.length },
  ].filter((s) => s.shown > 0)
  const total = counted(pubs).length + counted(theses).length + counted(patents).length + projects.length

  // 이 사람에게 있는 종류만 버튼으로 만듭니다. 종류가 하나뿐이면 버튼 줄은 생략합니다.
  const kinds = [
    ...['journal', 'conference', 'book']
      .filter((t) => pubs.some((p) => p.type === t))
      .map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1) })),
    ...(theses.length > 0 ? [{ key: 'theses', label: 'Dissertations' }] : []),
    ...(projects.length > 0 ? [{ key: 'projects', label: 'Projects' }] : []),
    ...(patents.length > 0 ? [{ key: 'patents', label: 'Patents' }] : []),
  ]
  const showKinds = kinds.length >= 2
  const current = showKinds && kinds.some((k) => k.key === view) ? view : 'all'
  const pubFilter = ['journal', 'conference', 'book'].includes(current) ? current : 'all'
  const only = current !== 'all' // 한 종류만 골랐을 때: 그 종류만 보여줍니다.
  const visible = sections.filter((s) => {
    if (!only) return true
    if (pubFilter !== 'all') return s.key === 'publications'
    return s.key === current
  })

  return (
    <div className="author-research">
      <div className="pub-author-head" ref={headRef}>
        <div>
          <h2 className="pub-author-name">
            {author.displayName || author.name}
          </h2>
        </div>
        <button type="button" className="pub-author-clear" onClick={onClear}>
          {tr('전체 연구 실적 보기', 'View all research')}
        </button>
      </div>

      {author.hidden && (
        <p className="author-hidden-note">
          이 모아보기는 방문자에게 숨겨져 있어요. 관리자에게만 보입니다. (People 팝업에서 “표시하기”로 다시 보이게 할 수 있어요.)
        </p>
      )}

      {total === 0 && <p className="empty-state">{tr('아직 등록된 연구 실적이 없습니다.', 'No research output yet.')}</p>}

      {showKinds && (
        <div className="author-kinds" role="tablist" aria-label={tr('실적 종류', 'Type of output')}>
          {[{ key: 'all', label: 'All' }, ...kinds].map((k) => (
            <button
              key={k.key}
              type="button"
              role="tab"
              aria-selected={current === k.key}
              className={`filter-chip${current === k.key ? ' active' : ''}`}
              onClick={() => setView(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {visible.map((s) => (
        <section key={s.key} className="author-section">
          {/* 한 종류만 있을 땐 소제목이 오히려 군더더기라 생략합니다 */}
          {sections.length > 1 && !only && (
            <h3 className="author-section-title">
              {s.title}
            </h3>
          )}
          {s.key === 'publications' && (
            <Publications
              items={pubs}
              onEdit={onEdit.publications}
              embedded
              focus={focus}
              authorTool={toolFor('publications')}
              filter={showKinds ? pubFilter : undefined}
              filterRow={showKinds ? null : undefined}
            />
          )}
          {s.key === 'theses' && <Theses items={theses} onEdit={onEdit.theses} focus={focus} authorTool={toolFor('publications')} />}
          {s.key === 'projects' && <Projects items={projects} onEdit={onEdit.projects} focus={focus} />}
          {s.key === 'patents' && (
            <Patents
              items={patents}
              onEdit={onEdit.patents}
              onToggleHidden={onToggleHidden}
              focus={focus}
              authorTool={toolFor('patents')}
            />
          )}
        </section>
      ))}
    </div>
  )
}
