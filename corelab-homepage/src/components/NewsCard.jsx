import SafeImage from './SafeImage'

// 본문 중간에 사진을 넣고 싶을 때 쓰는 표시: [사진2], [사진2:왼쪽], [사진2:오른쪽] ...
// (첫 번째 사진은 대표 사진으로 이미 사용됨. 정렬을 안 쓰면 가운데)
const IMAGE_MARKER = /^\[\s*사진\s*(\d+)(?:\s*:\s*(왼쪽|가운데|오른쪽))?\s*\]$/

const ALIGN_KEY = { 왼쪽: 'left', 가운데: 'center', 오른쪽: 'right' }
const ALIGN_CLASS = { left: 'align-left', center: 'align-center', right: 'align-right' }

function alignClass(align) {
  return ALIGN_CLASS[align] || ALIGN_CLASS.center
}

// 예전 프리셋(작게/보통/크게/전체너비)으로 저장된 글도 그대로 보이도록 픽셀로 변환
const LEGACY_SIZE_PX = { small: 300, medium: 460, large: 680, full: 1200 }

function heroWidthPx(item) {
  const n = Number(item.imageWidth)
  if (Number.isFinite(n) && n > 0) return n
  return LEGACY_SIZE_PX[item.imageSize] || 460
}

/**
 * 뉴스 기사 한 편을 클릭 없이 그대로 보여주는 카드.
 * 첫 번째 사진은 크기·정렬을 조절할 수 있는 "대표 사진"으로 제목 아래 나오고,
 * 본문 중간에 [사진2], [사진2:왼쪽]처럼 표시해두면 그 자리에 해당 사진이 삽입됩니다.
 * 표시하지 않은 나머지 사진은 글 맨 아래에 모아서 보여줍니다.
 * 날짜는 어디에도 표시하지 않습니다 (정렬은 등록 순서로만 합니다).
 */
export default function NewsCard({ item }) {
  const images = Array.isArray(item.images)
    ? item.images.filter(Boolean)
    : [item.images, item.thumbnail].filter(Boolean)
  const body = Array.isArray(item.body) ? item.body : item.summary ? [item.summary] : []
  const mainImage = images[0]

  const usedIndexes = new Set()
  body.forEach((paragraph) => {
    const m = paragraph.trim().match(IMAGE_MARKER)
    if (m) usedIndexes.add(Number(m[1]) - 1)
  })
  const leftoverImages = images.filter((_, i) => i !== 0 && !usedIndexes.has(i))

  return (
    <article className="news-article">
      {item.title && <h3 className="news-article-title">{item.title}</h3>}
      {item.subtitle && <p className="news-article-subtitle">{item.subtitle}</p>}

      {mainImage && (
        <div
          className={`news-article-hero news-article-hero-${alignClass(item.imageAlign)}`}
          style={{ maxWidth: `min(${heroWidthPx(item)}px, 100%)` }}
        >
          <SafeImage src={mainImage} alt="" fallback={<span />} />
        </div>
      )}

      {body.map((paragraph, i) => {
        const m = paragraph.trim().match(IMAGE_MARKER)
        if (m) {
          const src = images[Number(m[1]) - 1]
          if (!src) return null
          const align = ALIGN_KEY[m[2]] || 'center'
          return (
            <div className={`news-article-inline-img news-article-inline-img-${alignClass(align)}`} key={i}>
              <SafeImage src={src} alt="" fallback={<span />} />
            </div>
          )
        }
        return (
          <p key={i} className="news-article-p">
            {paragraph}
          </p>
        )
      })}

      {leftoverImages.length > 0 && (
        <div className={`news-article-images${leftoverImages.length === 1 ? ' single' : ''}`}>
          {leftoverImages.map((src, i) => (
            <div className="news-article-img" key={i}>
              <SafeImage src={src} alt="" fallback={<span />} />
            </div>
          ))}
        </div>
      )}

      {item.link && (
        <a className="news-article-link" href={item.link} target="_blank" rel="noreferrer">
          관련 링크 →
        </a>
      )}
    </article>
  )
}
