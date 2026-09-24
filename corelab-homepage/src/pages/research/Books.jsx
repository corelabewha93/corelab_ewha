import { EditButton } from '../../components/admin/AdminControls'

/**
 * 저역서 — research.json의 publications 중 type이 'book'인 항목.
 * (관리자 화면에서 "종류: Book (저역서)"로 추가하면 여기에 나타납니다.)
 *
 * translators(옮긴이)가 있으면 "번역서"로, 없으면 "저서"로 표시합니다.
 * bookRole을 적어두면 그 문구로 대체됩니다 (예: "챕터 집필" — 책 전체가 아니라
 * 여러 저자가 나눠 쓴 편저의 한 챕터만 집필한 경우).
 * 표지 이미지 없이 텍스트만으로 표시합니다.
 */
export default function Books({ items = [], onEdit }) {
  const books = items
    .filter((p) => p.type === 'book')
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))

  if (books.length === 0) return <p className="empty-state">등록된 저역서가 없습니다.</p>

  return (
    <ul className="book-list">
      {books.map((book) => {
        const isTranslation = (book.translators?.length ?? 0) > 0
        const roleLabel = book.bookRole?.trim() || (isTranslation ? '번역서' : '저서')
        const roleIsDefault = !book.bookRole?.trim()
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
                  className={`book-role-badge${roleIsDefault && isTranslation ? ' book-role-translation' : ''}${!roleIsDefault ? ' book-role-custom' : ''}`}
                >
                  {roleLabel}
                </span>
              </p>
              {book.authors?.length > 0 && (
                <p className="book-authors">
                  <span className="book-role-label">지은이</span>
                  {book.authors.join(', ')}
                </p>
              )}
              {isTranslation && (
                <p className="book-authors">
                  <span className="book-role-label">옮긴이</span>
                  {book.translators.join(', ')}
                </p>
              )}
              <p className="book-meta">{[book.venue, book.details].filter(Boolean).join(' · ')}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
