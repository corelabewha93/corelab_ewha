import { useState } from 'react'

/**
 * src가 비어있거나 로드에 실패하면 fallback(children)을 보여주는 이미지.
 * JSON에 이미지 경로가 비어 있거나 오타가 나도 레이아웃이 깨지지 않게 합니다.
 */
export default function SafeImage({ src, alt, fallback, className, imgStyle }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = src ? `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}` : null

  if (!resolvedSrc || failed) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={imgStyle}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
