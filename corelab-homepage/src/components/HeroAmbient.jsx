import '../styles/hero-ambient.css'
import { scrollToSection } from '../router/scrollToSection'
import { useLang } from '../i18n/LangContext'

/**
 * 메인 화면 맨 아래의 작은 "아래로" 화살표. 누르면 Lab Overview로 내려갑니다.
 * (파일 이름은 예전 그대로 HeroAmbient.jsx — 안에는 이 화살표만 남아 있습니다.)
 * 인트로가 다 끝난 뒤에 조용히 나타나고, 동작 줄이기 설정이면 움직이지 않습니다.
 */
export default function HeroScrollCue() {
  const { tr } = useLang()
  const label = tr('Lab Overview로 내려가기', 'Scroll to Lab Overview')
  return (
    <button type="button" className="hero-scroll-cue" aria-label={label} title={label} onClick={() => scrollToSection('overview')}>
      <svg viewBox="0 0 12 30" aria-hidden="true" focusable="false">
        <path className="hero-cue-line" d="M6 1 V24" />
        <path className="hero-cue-head" d="M1.8 19.5 L6 24.2 L10.2 19.5" />
      </svg>
    </button>
  )
}
