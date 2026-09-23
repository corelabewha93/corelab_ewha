import SafeImage from './SafeImage'

// 본문 중간에 사진을 넣고 싶을 때 쓰는 표시: [사진2], [사진3] ... (첫 번째 사진은 대표 사진으로 이미 사용됨)
const IMAGE_MARKER = /^\[\s*사진\s*(\d+)\s*\]$/

/**
 * 뉴스 기사 한 편을 클릭 없이 그대로 보여주는 카드.
 * 첫 번째 사진은 크기 조절이 가능한 "대표 사진"으로 제목 아래 크게 나오고,
 * 본문 중간에 [사진2]처럼 표시해두면 그 자리에 해당 사진이 삽입됩니다.
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

      {mainImage && (
        <div className={`news-article-hero news-article-hero-${item.imageSize || 'medium'}`}>
          <SafeImage src={mainImage} alt="" fallback={<span />} />
        </div>
      )}

      {body.map((paragraph, i) => {
        const m = paragraph.trim().match(IMAGE_MARKER)
        if (m) {
          const src = images[Number(m[1]) - 1]
          if (!src) return null
          return (
            <div className="news-article-inline-img" key={i}>
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
