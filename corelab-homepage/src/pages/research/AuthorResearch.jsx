import { useEffect, useMemo } from 'react'
import Publications from './Publications'
import Theses from './Theses'
import Patents from './Patents'
import Projects from './Projects'
import { makeFocus, includesFocus } from './authorMatch'
import { useAdminAuth } from '../../admin/AdminAuthContext'

/**
 * "OOO의 연구 실적" — People 페이지에서 들어오는 한 사람의 모아보기 화면.
 * 논문·저역서(저자·옮긴이) · 학위논문 · 특허(발명자)에 이름이 올라간 실적만 모아 보여줍니다.
 * people.json에 적어둔 영문 표기(pubNames)도 같은 사람으로 봅니다.
 */
export default function AuthorResearch({ data, author, onClear, onEdit, onToggleHidden, onToggleExclude }) {
  const { isAdmin } = useAdminAuth()
  const focus = useMemo(() => makeFocus(author.aliases), [author])

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
      projects: (data.projects ?? []).filter((p) => includesFocus((p.members ?? []).map((m) => m.name), focus)),
    }
  }, [data, focus, isAdmin, author.name])

  const toolFor = (dataKey) =>
    isAdmin && onToggleExclude
      ? { name: author.name, isExcluded, onToggle: (item) => onToggleExclude(item, dataKey, author.name) }
      : null

  // 건수는 "제외된 항목"을 빼고 셉니다. (관리자 화면에도 방문자와 같은 숫자가 보입니다)
  const counted = (list) => list.filter((p) => !isExcluded(p))

  // 0건인 종류는 요약·목록 모두에서 뺍니다.
  const sections = [
    { key: 'publications', title: 'Publications', count: counted(pubs).length, shown: pubs.length },
    { key: 'theses', title: 'Dissertations', count: counted(theses).length, shown: theses.length },
    { key: 'projects', title: 'Projects', count: projects.length, shown: projects.length },
    { key: 'patents', title: 'Patents', count: counted(patents).length, shown: patents.length },
  ].filter((s) => s.shown > 0)
  const total = counted(pubs).length + counted(theses).length + counted(patents).length + projects.length

  // 상단 요약: "논문 5"처럼 뭉뚱그리지 않고 학술지 / 학회 발표 / 저역서 / 학위논문을 나눠서 셉니다.
  const countType = (t) => counted(pubs).filter((p) => p.type === t).length
  const summary = [
    ['학술지 논문', countType('journal')],
    ['학회 발표', countType('conference')],
    ['저역서', countType('book')],
    ['학위논문', counted(theses).length],
    ['연구과제', projects.length],
    ['특허', counted(patents).length],
  ].filter(([, n]) => n > 0)

  return (
    <div className="author-research">
      <div className="pub-author-head">
        <div>
          <p className="pub-author-eyebrow">Research Output</p>
          <h2 className="pub-author-name">
            {author.name}
            <span className="pub-author-count">{total}건</span>
          </h2>
          {summary.length > 0 && (
            <p className="pub-author-breakdown">{summary.map(([l, n]) => `${l} ${n}`).join(' · ')}</p>
          )}
        </div>
        <button type="button" className="pub-author-clear" onClick={onClear}>
          전체 연구 실적 보기
        </button>
      </div>

      {author.hidden && (
        <p className="author-hidden-note">
          이 모아보기는 방문자에게 숨겨져 있어요. 관리자에게만 보입니다. (People 팝업에서 “표시하기”로 다시 보이게 할 수 있어요.)
        </p>
      )}

      {total === 0 && <p className="empty-state">아직 등록된 연구 실적이 없습니다.</p>}

      {sections.map((s) => (
        <section key={s.key} className="author-section">
          {/* 한 종류만 있을 땐 소제목이 오히려 군더더기라 생략합니다 */}
          {sections.length > 1 && (
            <h3 className="author-section-title">
              {s.title}
              <span className="author-section-count">{s.count}</span>
            </h3>
          )}
          {s.key === 'publications' && (
            <Publications
              items={pubs}
              onEdit={onEdit.publications}
              embedded
              focus={focus}
              authorTool={toolFor('publications')}
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
