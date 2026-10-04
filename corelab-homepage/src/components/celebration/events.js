/**
 * 기념일 효과 설정 — 문구를 바꾸고 싶으면 이 파일의 글만 고치면 됩니다.
 *
 *  - month / day : 효과가 켜지는 날짜 (한국 시간 기준, 하루 종일)
 *  - theme       : 'party'(풍선·파티 모자) 또는 'carnation'(카네이션)
 *  - kicker, title, sub, from : 처음에 크게 뜨는 축하 화면의 글
 *      · title 은 [첫째 줄, 둘째 줄] — PC에서는 한 줄로, 휴대폰에서는 두 줄로 보입니다.
 *      · sub 은 [강조되는 부분, 이어지는 부분]
 *  - messages    : 맨 위 띠 배너에서 3초마다 바뀌는 문구 (개수는 자유)
 *  - replayLabel : 배너 오른쪽 버튼 글자 (누르면 큰 축하 화면이 다시 나와요)
 *
 * 미리보기: 사이트 주소 뒤에 ?celebrate=birthday 또는 ?celebrate=teachers 를 붙이면
 * 날짜와 상관없이 그 효과를 바로 볼 수 있습니다. (예: corelab.ewha.ac.kr/?celebrate=birthday)
 */
export const EVENTS = [
  {
    id: 'birthday',
    month: 11,
    day: 14,
    theme: 'party',
    kicker: 'NOVEMBER 14',
    title: ['Happy', 'Birthday'],
    sub: ['임규연 교수님', ', 생신을 진심으로 축하드립니다'],
    from: '— CoRe Lab, with love —',
    replayLabel: '폭죽 한 번 더',
    messages: [
      '오늘은 임규연 교수님의 생신입니다. CoRe Lab 일동이 진심으로 축하드립니다.',
      '속보: 오늘만큼은 모든 Reviewer 2가 Accept를 눌렀다는 소문 (※ 확인된 바 없음)',
      '오늘의 통계: 생신 효과 p < .001 — 가장 유의미한 하루입니다',
      '오늘만큼은 R&R 없이 Accept! 내일부터 다시 열심히 하겠습니다',
    ],
  },
  {
    id: 'teachers',
    month: 5,
    day: 15,
    theme: 'carnation',
    kicker: 'MAY 15',
    title: ['Happy', "Teacher's Day"],
    sub: ['임규연 교수님', ', 늘 감사드립니다'],
    from: '— CoRe Lab, with gratitude —',
    replayLabel: '카네이션 한 번 더',
    messages: [
      '오늘은 스승의 날입니다. 늘 길을 밝혀주시는 임규연 교수님께 CoRe Lab 일동이 감사드립니다.',
      '오늘의 학습곡선: 교수님 덕분에 우상향입니다 (※ 95% 신뢰구간)',
      '오늘의 통계: 지도교수님의 영향력 p < .001, 효과크기는 “매우 큼”',
      '오늘은 R&R 대신 감사 인사만 받아주세요. 내일부터 다시 열심히 하겠습니다',
    ],
  },
]

/** 한국 시간 기준 오늘의 (월, 일) */
export function kstMonthDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).formatToParts(now)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value)
  return { month: get('month'), day: get('day') }
}

/** 지금 켜져야 하는 기념일 (없으면 null). forcedId가 있으면 날짜와 상관없이 그 기념일을 돌려줍니다. */
export function findActiveEvent(forcedId, now = new Date()) {
  if (forcedId) return EVENTS.find((e) => e.id === forcedId) ?? null
  const { month, day } = kstMonthDay(now)
  return EVENTS.find((e) => e.month === month && e.day === day) ?? null
}
