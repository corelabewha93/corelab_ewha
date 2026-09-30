import { useHashRoute, navigate, withBase } from './useHashRoute'

/** <a href="/news">처럼 동작하되, 클릭하면 새로고침 없이 이동하고, 현재 경로와 일치하면 active 클래스를 붙여줍니다. */
export default function Link({ to, children, className = '', onClick, ...rest }) {
  const { path } = useHashRoute()
  const targetPath = to.split('?')[0]
  const isActive = path === targetPath
  const classes = [className, isActive ? 'active' : ''].filter(Boolean).join(' ')

  // 메뉴 닫기처럼 바깥에서 넘겨준 onClick도 함께 실행합니다.
  // (예전엔 이 onClick이 아래 새로고침 없는 이동을 덮어써서, 상단 메뉴를 누를 때마다 페이지 전체가 새로 불러와졌습니다.)
  const handleClick = (e) => {
    onClick?.(e)
    // 새 탭으로 열기(가운데 클릭, Cmd/Ctrl/Shift 클릭)는 그대로 브라우저 기본 동작에 맡깁니다.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }

  return (
    <a href={withBase(to)} className={classes} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
