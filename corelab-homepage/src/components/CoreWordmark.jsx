import { LOGO_TRANSFORM, INNER_SCALE, LETTERS, DOT_A, DOT_B, CURVE } from './coreLogoPaths'

/**
 * CoRe 로고 (정지 이미지) — 메인 화면에서 완성되는 로고와 똑같은 모양·색입니다.
 *   글자: 골드 · o 위 학습자: 아이보리 · R 위 학습자와 어깨선: 민트
 *
 * 글자 크기(em)에 맞춰 커지고 작아지며, 옆에 오는 "Lab"(Philosopher 글꼴)과
 * 글자 높이·기준선이 딱 맞도록 메인 화면(HeroIntro.jsx)과 같은 기준으로 그립니다.
 */

const GOLD = '#e4d083'
const IVORY = '#f5f2e8'
const MINT = '#8fe3ea'

const GLYPH_U = 223 / 0.47 // 로고 x높이(223) = Philosopher x높이(0.47em)
const GLYPH_TOP = 675 - 0.8 * GLYPH_U // 로고 기준선(675) = 글자 기준선 (vertical-align -0.2em과 짝)
const X0 = 135
const X1 = 1233

function Layer({ d, color }) {
  return (
    <g transform={LOGO_TRANSFORM} fill={color}>
      <path d={d} stroke={color} strokeWidth={3.6 * INNER_SCALE} strokeLinejoin="round" />
    </g>
  )
}

export default function CoreWordmark({ className = '', title = 'CoRe' }) {
  return (
    <svg
      className={`core-wordmark ${className}`}
      viewBox={`${X0} ${GLYPH_TOP} ${X1 - X0} ${GLYPH_U}`}
      style={{ width: `${((X1 - X0) / GLYPH_U).toFixed(4)}em` }}
      role="img"
      aria-label={title}
    >
      <Layer d={CURVE} color={MINT} />
      <g transform={LOGO_TRANSFORM} fill={GOLD}>
        <path d={LETTERS} />
      </g>
      <Layer d={DOT_A} color={IVORY} />
      <Layer d={DOT_B} color={MINT} />
    </svg>
  )
}
