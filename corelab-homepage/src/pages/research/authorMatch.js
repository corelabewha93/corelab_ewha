/**
 * "OOO의 연구 실적" 모아보기에서 쓰는 이름 비교 도우미.
 * "Kim, H. J." / "Kim H.J." / "kim h j" 를 같은 이름으로 보도록 쉼표·점·공백을 지우고 소문자로 맞춥니다.
 */
export function normalizeName(name = '') {
  return name.toLowerCase().replace(/[\s.,·]/g, '')
}

/** 한글 이름 + 따로 적어둔 영문 표기들을 비교용 Set으로 */
export function makeFocus(aliases = []) {
  return new Set(aliases.map(normalizeName).filter(Boolean))
}

/** 이름 목록 중 한 명이라도 모아보기 대상이면 true */
export function includesFocus(names, focus) {
  return (names ?? []).some((n) => focus.has(normalizeName(n)))
}
