/**
 * 홈 화면 안의 구역(예: Lab Overview)으로 부드럽게 내려갑니다.
 * 구역 위쪽 여백(고정 헤더에 가려지지 않게)은 global.css의 scroll-margin-top이 맡습니다.
 */
export function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return false
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  return true
}
