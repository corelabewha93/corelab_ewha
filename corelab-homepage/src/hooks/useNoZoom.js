import { useEffect } from 'react'

/**
 * 이 훅을 쓰는 페이지가 열려 있는 동안에만 화면 확대(줌인)를 막습니다. (Lab Life 사진 페이지에서 사용)
 * 페이지를 벗어나면 모두 원래대로 돌아가므로 다른 페이지에는 영향이 없습니다.
 *
 * 브라우저마다 확대 방식이 달라서 여러 겹으로 막습니다.
 *  - 휴대폰 두 손가락 벌리기(핀치) : 화면 설정(viewport) + touch-action + 두 손가락 터치 차단
 *  - 아이폰 사파리                 : 위 설정을 무시하므로 사파리 전용 제스처 이벤트를 따로 차단
 *  - 두 번 톡톡 두드려 확대         : touch-action
 *  - PC 트랙패드 두 손가락 벌리기 / Ctrl + 마우스 휠 : 휠 이벤트 차단
 * (키보드 Ctrl + / Ctrl − 로 하는 브라우저 전체 확대는 시력이 약한 분들을 위한 기능이라 막지 않습니다.)
 */
const NO_ZOOM_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'

export function useNoZoom() {
  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="viewport"]')
    const prevViewport = meta?.getAttribute('content')
    meta?.setAttribute('content', NO_ZOOM_VIEWPORT)
    root.classList.add('no-zoom')

    const block = (e) => e.preventDefault()
    const blockMultiTouch = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    const blockCtrlWheel = (e) => {
      if (e.ctrlKey) e.preventDefault() // 트랙패드 핀치는 브라우저가 Ctrl + 휠로 알려줍니다
    }

    const opts = { passive: false }
    document.addEventListener('gesturestart', block, opts)
    document.addEventListener('gesturechange', block, opts)
    document.addEventListener('gestureend', block, opts)
    document.addEventListener('touchstart', blockMultiTouch, opts)
    document.addEventListener('touchmove', blockMultiTouch, opts)
    window.addEventListener('wheel', blockCtrlWheel, opts)

    return () => {
      if (meta && prevViewport != null) meta.setAttribute('content', prevViewport)
      root.classList.remove('no-zoom')
      document.removeEventListener('gesturestart', block, opts)
      document.removeEventListener('gesturechange', block, opts)
      document.removeEventListener('gestureend', block, opts)
      document.removeEventListener('touchstart', blockMultiTouch, opts)
      document.removeEventListener('touchmove', blockMultiTouch, opts)
      window.removeEventListener('wheel', blockCtrlWheel, opts)
    }
  }, [])
}
