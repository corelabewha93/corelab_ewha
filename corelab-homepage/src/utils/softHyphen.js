/**
 * 모바일 양쪽 정렬용: 긴 영어 단어에 "보이지 않는 줄바꿈 지점(소프트 하이픈)"을 넣어 줍니다.
 * 좁은 화면에서 "Collaborative Research Learning Lab" 같은 긴 영어가 줄 끝에 걸리면
 * 줄 전체가 띄어쓰기 몇 군데로만 늘어나 간격이 크게 벌어지는데,
 * 단어 중간에서 "Learn-" 처럼 나눌 수 있게 해 그 빈틈을 메웁니다.
 * (PC에서는 CSS로 이 지점을 꺼 두어 화면이 그대로입니다. 글자로는 보이지 않습니다.)
 * 사전에 없는 단어는 그대로 둡니다.
 */
const SYLLABLES = [
  'col-lab-o-ra-tive',
  're-search',
  'learn-ing',
  'learn-ers',
  'an-a-lyt-ics',
  'to-geth-er',
  'tech-nol-o-gy',
  'tech-nol-o-gies',
  'ed-u-ca-tion-al',
  'ed-u-ca-tion',
  'ex-pe-ri-ence',
  'reg-u-la-tion',
  'sup-port-ed',
  'com-put-er',
  'in-tel-li-gence',
  'ar-ti-fi-cial',
  'in-ter-ac-tion',
  'dash-board',
  're-spon-si-ble',
  'col-lab-o-ra-tion',
  'en-hanced',
  'in-struc-tion-al',
]

const MAP = new Map(SYLLABLES.map((s) => [s.replace(/-/g, ''), s.split('-').map((p) => p.length)]))

export function softHyphen(text = '') {
  if (typeof text !== 'string') return text
  return text.replace(/[A-Za-z]{7,}/g, (word) => {
    const parts = MAP.get(word.toLowerCase())
    if (!parts) return word
    let out = ''
    let at = 0
    parts.forEach((n, i) => {
      out += word.slice(at, at + n) + (i < parts.length - 1 ? '­' : '')
      at += n
    })
    return out
  })
}
