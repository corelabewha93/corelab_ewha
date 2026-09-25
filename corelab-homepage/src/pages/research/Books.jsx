import { EditButton } from '../../components/admin/AdminControls'
import FocusNames from './FocusNames'

/**
 * 저역서 — research.json의 publications 중 type이 'book'인 항목.
 * (관리자 화면에서 "종류: Book (저역서)"로 추가하면 여기에 나타납니다.)
 *
 * translators(옮긴이)가 있으면 "번역서"로, 없으면 "저서"로 자동 표시합니다.
 * (예전의 직접 입력 배지 문구 "챕터 집필" 등은 더 이상 쓰지 않습니다.)
 * 절판·품절 같은 판매 상태 문구는 표시하지 않습니다.
 * 표지 이미지 없이 텍스트만으로 표시합니다.
 */
/** 쪽수 등 세부 정보에 "절판"·"품절" 같은 판매 상태가 섞여 있으면 빼고 보여줍니다. */
function stripSaleStatus(text = '') {
  return text
    .split('·')
    .map((part) => part.replace(/\(?\s*(절판|품절)\s*\)?/g, '').trim())
    .filter(Boolean)
    .join(' · ')
}

export default function Books({ items = [], onEdit, focus = null }) {
  const books = items
    .filter((p) => p.type === 'book')
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))

  if (books.length === 0) return <p className="empty-state">등록된 저역서가 없습니다.</p>

  return (
    <ul className="book-list">
      {books.map((book) => {
        const isTranslation = (book.translators?.length ?? 0) > 0
        const roleLabel = isTranslation ? '번역서' : '저서'
        const meta = [book.venue, stripSaleStatus(book.details)].filter(Boolean).join(' · ')
        return (
          <li key={book.id} className="book-row admin-item">
            <EditButton onClick={() => onEdit(book)} />
            <span className="book-row-year">{book.year}</span>
            <div className="book-row-body">
              <p className="book-title">
                {book.link ? (
                  <a href={book.link} target="_blank" rel="noreferrer">
                    {book.title}
                  </a>
                ) : (
                  book.title
                )}
                <span
                  className={`book-role-badge${isTranslation ? ' book-role-translation' : ''}`}
                >
                  {roleLabel}
                </span>
              </p>
              {book.authors?.length > 0 && (
                <p className="book-authors">
                  <span className="book-role-label">지은이</span>
                  <FocusNames names={book.authors} focus={focus} />
                </p>
              )}
              {isTranslation && (
                <p className="book-authors">
                  <span className="book-role-label">옮긴이</span>
                  <FocusNames names={book.translators} focus={focus} />
                </p>
              )}
              {meta && <p className="book-meta">{meta}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
