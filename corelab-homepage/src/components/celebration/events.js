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
 *  - subEn, messagesEn, replayLabelEn : 오른쪽 위 EN(영어 화면)일 때 쓰는 영어 문구
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
    subEn: ['Prof. Kyu Yon Lim', ', wishing you a very happy birthday'],
    replayLabelEn: 'Once more',
    messagesEn: [
      "It's our professor's birthday today! Let's celebrate together 🎉",
      'Professor, today is an all-day cake day 🎂',
      'Happy birthday! Wishing you nothing but joy, today and always ✨',
      'Balloons, confetti, and lots of love for you 🎈',
      "Today's wish: 100% happiness for our professor. Stay well 💛",
    ],
    messages: [
      '오늘은 우리 교수님 생신이에요! 다 같이 축하해요 🎉',
      '교수님, 오늘은 하루 종일 케이크 먹는 날이에요 🎂',
      '생신 축하드려요! 오늘도 내일도 쭉 꽃길만 걸으세요 ✨',
      '풍선도 색종이도 사랑도 가득 드립니다 🎈',
      '오늘의 소원은 교수님의 행복 100%! 늘 건강하세요 💛',
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
    subEn: ['Prof. Kyu Yon Lim', ', thank you for everything'],
    replayLabelEn: 'Once more',
    messagesEn: [
      "Happy Teacher's Day! In place of carnations, we send you our hearts 💐",
      "Thanks to you, we're growing a little more every day 🌱",
      'Thank you for teaching us! Today, we cheer for you 💪',
      "You're our forever favorite teacher ⭐",
      'Wishing you a day full of gratitude and smiles 😊',
    ],
    messages: [
      '스승의 날, 늘 감사해요! 카네이션 대신 마음을 한가득 드려요 💐',
      '교수님 덕분에 저희는 오늘도 쑥쑥 자라는 중이에요 🌱',
      '가르쳐 주셔서 감사해요! 오늘은 저희가 응원할게요 💪',
      '교수님은 저희의 영원한 최고 선생님이에요 ⭐',
      '오늘 하루 감사도 웃음도 가득 보내세요 😊',
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
