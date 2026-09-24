import { useMemo } from 'react'
import Publications from './Publications'
import Books from './Books'
import Patents from './Patents'
import { makeFocus, includesFocus } from './authorMatch'

/**
 * "OOO의 연구 실적" — People 페이지에서 들어오는 한 사람의 모아보기 화면.
 * 논문(저자) · 저역서(지은이·옮긴이) · 특허(발명자)에 이름이 올라간 실적만 모아 보여줍니다.
 * people.json에 적어둔 영문 표기(pubNames)도 같은 사람으로 봅니다.
 */
export default function AuthorResearch({ data, author, onClear, onEdit }) {
  const focus = useMemo(() => makeFocus(author.aliases), [author])

  const { pubs, books, patents } = useMemo(() => {
    const all = data.publications ?? []
    return {
      pubs: all.filter((p) => p.type !== 'book' && includesFocus(p.authors, focus)),
      books: all.filter(
        (p) => p.type === 'book' && (includesFocus(p.authors, focus) || includesFocus(p.translators, focus)),
      ),
      patents: (data.patents ?? []).filter((p) => includesFocus(p.inventors, focus)),
    }
  }, [data, focus])

  // 0건인 종류는 요약·목록 모두에서 뺍니다.
  const sections = [
    { key: 'publications', title: 'Publications', count: pubs.length },
    { key: 'books', title: 'Books', count: books.length },
    { key: 'patents', title: 'Patents', count: patents.length },
  ].filter((s) => s.count > 0)
  const total = pubs.length + books.length + patents.length

  // 상단 요약: "논문 5"처럼 뭉뚱그리지 않고 학술지 / 학회 발표 / 학위논문을 나눠서 셉니다.
  const countType = (t) => pubs.filter((p) => p.type === t).length
  const summary = [
    ['학술지 논문', countType('journal')],
    ['학회 발표', countType('conference')],
    ['학위논문', countType('other')],
    ['저역서', books.length],
    ['특허', patents.length],
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
            <Publications items={pubs} onEdit={onEdit.publications} embedded focus={focus} />
          )}
          {s.key === 'books' && <Books items={books} onEdit={onEdit.books} focus={focus} />}
          {s.key === 'patents' && <Patents items={patents} onEdit={onEdit.patents} focus={focus} />}
        </section>
      ))}
    </div>
  )
}
