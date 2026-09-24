import { EditButton } from '../../components/admin/AdminControls'

/**
 * 저역서 — research.json의 publications 중 type이 'book'인 항목.
 * (관리자 화면에서 "종류: Book (저역서)"로 추가하면 여기에 나타납니다.)
 * 표지 이미지 없이 텍스트만으로 표시합니다.
 */
export default function Books({ items = [], onEdit }) {
  const books = items
    .filter((p) => p.type === 'book')
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))

  if (books.length === 0) return <p className="empty-state">등록된 저역서가 없습니다.</p>

  return (
    <ul className="book-list">
      {books.map((book) => (
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
            </p>
            {book.authors?.length > 0 && <p className="book-authors">{book.authors.join(', ')}</p>}
            <p className="book-meta">{[book.venue, book.details].filter(Boolean).join(' · ')}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
