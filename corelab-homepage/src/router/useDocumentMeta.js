import { useEffect } from 'react'

const SITE_NAME = 'CoRe Lab | 이화여자대학교 교육공학과'
const DEFAULT_DESCRIPTION =
  '이화여자대학교 교육공학과 임규연 교수 연구실 CoRe Lab — 협력학습(CSCL), 학습분석학, 협력적 문제해결을 연구합니다.'

function setMeta(name, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setMetaProperty(property, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 페이지마다 탭 제목(title)과 설명(meta description / og:description)을 바꿔줍니다.
 * 페이지를 벗어나면(언마운트되면) 원래 홈 화면 제목/설명으로 되돌립니다.
 *
 * (1) 카카오톡/문자 등으로 페이지를 직접 공유할 때 미리보기가 정확해지고
 * (2) 최신 크롤러(구글 등)는 페이지를 실제로 실행해서 본 뒤 색인하므로, 이 시점의 title/description도
 *     참고 정보로 쓰일 수 있습니다.
 */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const fullTitle = title ? `${title} | CoRe Lab` : SITE_NAME
    const desc = description || DEFAULT_DESCRIPTION

    document.title = fullTitle
    setMeta('description', desc)
    setMetaProperty('og:title', fullTitle)
    setMetaProperty('og:description', desc)
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)

    return () => {
      document.title = SITE_NAME
      setMeta('description', DEFAULT_DESCRIPTION)
      setMetaProperty('og:title', 'CoRe Lab | 이화여자대학교 교육공학과')
      setMetaProperty('og:description', '보이지 않는 것을, 보이게 — 협력학습 과정을 데이터로 포착하고 시각화하는 임규연 교수 연구실입니다.')
      setMeta('twitter:title', 'CoRe Lab | 이화여자대학교 교육공학과')
      setMeta('twitter:description', '보이지 않는 것을, 보이게 — Collaborative Learning Research Lab')
    }
  }, [title, description])
}
