/**
 * 연구실 정식 영문명 — 교수님 확정: "Collaborative Learning Research Lab" (CoRe = COllaborative … REsearch)
 *
 * 관리자 화면에 예전 이름("Collaborative Research Learning Lab")이 저장돼 있어도 화면에는 새 이름으로 보이도록
 * 글자를 바꿔 줍니다. 관리자 화면에서 새 이름으로 고쳐 저장하면 이 함수는 아무것도 바꾸지 않습니다.
 */
export const LAB_NAME_EN = 'Collaborative Learning Research Lab'

const OLD_NAME = /Collaborative\s+Research\s+Learning\s+Lab/gi

export function fixLabName(text) {
  if (typeof text !== 'string') return text
  return text.replace(OLD_NAME, LAB_NAME_EN)
}

export function fixLabNameDeep(value) {
  if (typeof value === 'string') return fixLabName(value)
  if (Array.isArray(value)) return value.map(fixLabNameDeep)
  return value
}
