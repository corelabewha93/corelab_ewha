import { useEffect, useRef } from 'react'
import '../styles/hero-ambient.css'
import { scrollToSection } from '../router/scrollToSection'
import { useLang } from '../i18n/LangContext'

/**
 * 메인 화면 맨 아래의 작은 "아래로" 화살표. 누르면 Lab Overview로 내려갑니다.
 * (파일 이름은 예전 그대로 HeroAmbient.jsx — 안에는 이 화살표만 남아 있습니다.)
 * 평소에는 보이지 않다가, 마우스가 화살표 근처(약 140px)로 다가오면 부드럽게 나타납니다.
 * 키보드로 Tab을 눌러 포커스가 오면 나타나고, 동작 줄이기 설정이면 움직이지 않습니다.
 */
export default function HeroScrollCue() {
  const { tr } = useLang()
  const label = tr('Lab Overview로 내려가기', 'Scroll to Lab Overview')
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const NEAR = 140
    let raf = 0
    let last = null
    const check = () => {
      raf = 0
      if (!last) return
      const r = el.getBoundingClientRect()
      const dx = last.x - (r.left + r.width / 2)
      const dy = last.y - (r.top + r.height / 2)
      el.classList.toggle('is-near', Math.hypot(dx, dy) < NEAR)
    }
    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      last = { x: e.clientX, y: e.clientY }
      if (!raf) raf = requestAnimationFrame(check)
    }
    const onLeave = () => {
      last = null
      el.classList.remove('is-near')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <button ref={ref} type="button" className="hero-scroll-cue" aria-label={label} title={label} onClick={() => scrollToSection('overview')}>
      <svg viewBox="0 0 12 30" aria-hidden="true" focusable="false">
        <path className="hero-cue-line" d="M6 1 V24" />
        <path className="hero-cue-head" d="M1.8 19.5 L6 24.2 L10.2 19.5" />
      </svg>
    </button>
  )
}
