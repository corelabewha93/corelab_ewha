/**
 * 목록 하단 페이지 번호 (‹ 1 2 3 ›). 페이지가 1개뿐이면 아무것도 그리지 않습니다.
 * News / Lab Life에서 재사용합니다.
 */
export default function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null

  // 페이지가 많아도 한 줄에 들어가도록 현재 페이지 주변만 보여줍니다.
  const nums = []
  for (let n = 1; n <= pageCount; n += 1) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) nums.push(n)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        className="page-btn page-arrow"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        ‹
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} className="page-gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className={`page-btn${n === page ? ' active' : ''}`}
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`${n}페이지`}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        className="page-btn page-arrow"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </nav>
  )
}
