import { useEffect, useId, useRef } from 'react'
import { LOGO_TRANSFORM, INNER_SCALE, LETTERS, DOT_A, DOT_B, CURVE } from './coreLogoPaths'

/**
 * CoRe 워드마크 로고 (SVG) — 원본보다 아주 살짝 굵게 그립니다.
 *
 * animated일 때의 움직임 (두 학습자의 협력학습):
 *   등장: 글자 → 두 학습자(점)가 서로 다른 쪽에서 내려와 자리 잡음 → 둘을 잇는 곡선이 그려짐
 *   반복: ① A가 B 쪽으로 몸을 기울여 말을 걸고, 아이디어(빛)가 곡선을 따라 B에게 전해짐
 *         ② B가 끄덕이며 받아들이고(물결), 이번엔 B가 A 쪽으로 기울여 되돌려줌
 *         ③ A가 끄덕이고
 *         ④ 둘이 함께 서로에게 기울어지면 둘을 잇는 곡선 전체가 환하게 빛남 (함께 만든 이해)
 *
 * delay: 등장 시작 시각(초). 홈 히어로처럼 앞선 연출 뒤에 나타날 때 씁니다.
 */

const TONES = {
  light: { main: '#1c503d', sub: '#749375', glow: '#fffdf1' },
  // 이화 블루(민트/블루 계열) + 소프트 골드: 진한 초록 배경 위에서 산뜻하게 도드라지면서도
  // 브랜드 보조색 범위 안이라 차분하게 어울립니다.
  dark: { main: '#7fc9d9', sub: '#d9c97a', glow: '#fff6dc' },
}

const A = { x: 553, y: 406 }
const B = { x: 783.5, y: 310 }
const PULSE_PATH = 'M602 458 C652 463 690 452 722 426 C752 400 778 368 828 368'
const LOOP = 7

function Layer({ d, color, stroke }) {
  return (
    <g transform={LOGO_TRANSFORM} fill={color}>
      <path d={d} stroke={color} strokeWidth={stroke * INNER_SCALE} strokeLinejoin="round" />
    </g>
  )
}

function Ripple({ cx, cy, at, color, begin }) {
  const kt = `0; ${at}; ${(at + 0.12).toFixed(2)}; 1`
  return (
    <circle cx={cx} cy={cy} r="34" fill="none" stroke={color} strokeWidth="5" opacity="0">
      <animate attributeName="r" values="36; 36; 95; 95" keyTimes={kt} dur={`${LOOP}s`} begin={begin} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0; 0.6; 0; 0" keyTimes={kt} dur={`${LOOP}s`} begin={begin} repeatCount="indefinite" />
    </circle>
  )
}

export default function CoreLogo({ animated = false, tone = 'light', delay = 0, className = '', title = 'CoRe' }) {
  const ref = useRef(null)
  const uid = useId().replace(/:/g, '')
  const c = TONES[tone] ?? TONES.light
  const S = 3.6 // 살짝 굵게

  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const anim = animated && !reduce
  const t = (sec) => `${(delay + sec).toFixed(2)}s`
  const loopBegin = t(2.4)

  // 다른 페이지에서 이동해 들어와도 움직임이 처음부터 시작되도록 SVG 시계를 0으로 맞춥니다.
  useEffect(() => {
    if (anim) ref.current?.setCurrentTime?.(0)
  }, [anim])

  const loop = { dur: `${LOOP}s`, begin: loopBegin, repeatCount: 'indefinite' }

  return (
    <svg
      ref={ref}
      className={`core-logo${anim ? ' core-logo-animated' : ''} ${className}`}
      style={{ '--logo-delay': `${delay}s` }}
      viewBox="140 255 1090 440"
      role="img"
      aria-label={title}
    >
      {anim && (
        <defs>
          <clipPath id={`${uid}-reveal`}>
            <rect x="560" y="330" height="170" width="0">
              <animate attributeName="width" from="0" to="300" begin={t(1.2)} dur="0.9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
            </rect>
          </clipPath>
          <filter id={`${uid}-blur`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
      )}

      {/* 두 학습자를 잇는 곡선 + 함께 기울어질 때 환해지는 빛 */}
      <g clipPath={anim ? `url(#${uid}-reveal)` : undefined}>
        <Layer d={CURVE} color={c.sub} stroke={S} />
        {anim && (
          <g opacity="0">
            <animate attributeName="opacity" values="0; 0; 0.7; 0; 0" keyTimes="0; 0.84; 0.9; 0.98; 1" {...loop} />
            <Layer d={CURVE} color={c.glow} stroke={S} />
          </g>
        )}
      </g>

      <g className="core-logo-letters">
        <Layer d={LETTERS} color={c.main} stroke={S} />
      </g>

      {/* 학습자 A (o 위) */}
      <g className="core-logo-learner core-logo-learner-a">
        {anim && <Ripple cx={A.x} cy={A.y} at={0.72} color={c.sub} begin={loopBegin} />}
        <g>
          {anim && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 20 -9; 0 0; 0 0; 0 -30; 0 3; 0 0; 22 -9; 22 -9; 0 0; 0 0"
              keyTimes="0; 0.03; 0.08; 0.72; 0.75; 0.79; 0.82; 0.87; 0.92; 0.97; 1"
              {...loop}
            />
          )}
          <Layer d={DOT_A} color={c.sub} stroke={S} />
        </g>
      </g>

      {/* 학습자 B (R 위) */}
      <g className="core-logo-learner core-logo-learner-b">
        {anim && <Ripple cx={B.x} cy={B.y} at={0.3} color={c.main} begin={loopBegin} />}
        <g>
          {anim && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 0; 0 -30; 0 3; 0 0; -20 9; 0 0; 0 0; -22 9; -22 9; 0 0; 0 0"
              keyTimes="0; 0.3; 0.33; 0.37; 0.4; 0.44; 0.49; 0.82; 0.87; 0.92; 0.97; 1"
              {...loop}
            />
          )}
          <Layer d={DOT_B} color={c.main} stroke={S} />
        </g>
      </g>

      {/* 곡선을 따라 두 학습자 사이를 오가는 아이디어(빛) */}
      {anim && (
        <g opacity="0">
          <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0; 1; 1; 0; 0" keyTimes="0; 0.04; 0.07; 0.27; 0.3; 0.46; 0.49; 0.69; 0.72; 1" {...loop} />
          <animateMotion
            path={PULSE_PATH}
            keyPoints="0; 0; 1; 1; 0; 0"
            keyTimes="0; 0.05; 0.29; 0.48; 0.71; 1"
            calcMode="spline"
            keySplines="0 0 1 1; 0.45 0 0.35 1; 0 0 1 1; 0.45 0 0.35 1; 0 0 1 1"
            {...loop}
          />
          <circle r="30" fill={c.glow} opacity="0.6" filter={`url(#${uid}-blur)`} />
          <circle r="13" fill={c.glow} />
        </g>
      )}
    </svg>
  )
}
