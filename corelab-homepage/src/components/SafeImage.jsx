import { useState } from 'react'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { RAW_PUBLIC_URL } from '../admin/githubConfig'

/**
 * JSON에 적힌 이미지 경로(images/...)를 실제 주소로 바꿉니다.
 * 관리자 모드에서는 방금 올린 사진도 배포 전에 바로 보이도록 GitHub 원본 주소를 씁니다.
 */
export function resolveImageSrc(src, isAdmin) {
  if (!src) return null
  if (/^(https?:|blob:|data:)/.test(src)) return src
  const clean = src.replace(/^\//, '')
  if (isAdmin) return `${RAW_PUBLIC_URL}/${encodeURI(clean)}`
  return `${import.meta.env.BASE_URL}${clean}`
}

/**
 * src가 비어있거나 로드에 실패하면 fallback을 보여주는 이미지.
 * JSON에 이미지 경로가 비어 있거나 오타가 나도 레이아웃이 깨지지 않게 합니다.
 */
export default function SafeImage({ src, alt, fallback, className, imgStyle }) {
  const { isAdmin } = useAdminAuth()
  const resolvedSrc = resolveImageSrc(src, isAdmin)
  const [failedSrc, setFailedSrc] = useState(null)

  if (!resolvedSrc || failedSrc === resolvedSrc) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={imgStyle}
      onError={() => setFailedSrc(resolvedSrc)}
      loading="lazy"
      draggable={false}
    />
  )
}
