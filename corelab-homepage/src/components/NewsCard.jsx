import SafeImage from './SafeImage'

/**
 * 뉴스 기사 한 편을 클릭 없이 그대로 보여주는 카드.
 * 날짜는 더 이상 어디에도 표시하지 않습니다 (정렬은 등록 순서로만 합니다).
 */
export default function NewsCard({ item }) {
  const images = Array.isArray(item.images)
    ? item.images.filter(Boolean)
    : [item.images, item.thumbnail].filter(Boolean)
  const body = Array.isArray(item.body) ? item.body : item.summary ? [item.summary] : []

  return (
    <article className="news-article">
      {item.title && <h3 className="news-article-title">{item.title}</h3>}
      {body.map((paragraph, i) => (
        <p key={i} className="news-article-p">
          {paragraph}
        </p>
      ))}
      {images.length > 0 && (
        <div className={`news-article-images${images.length === 1 ? ' single' : ''}`}>
          {images.map((src, i) => (
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
