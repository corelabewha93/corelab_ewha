import { useHashRoute, navigate, withBase } from './useHashRoute'

/** <a href="/news">처럼 동작하되, 클릭하면 새로고침 없이 이동하고, 현재 경로와 일치하면 active 클래스를 붙여줍니다. */
export default function Link({ to, children, className = '', ...rest }) {
  const { path } = useHashRoute()
  const targetPath = to.split('?')[0]
  const isActive = path === targetPath
  const classes = [className, isActive ? 'active' : ''].filter(Boolean).join(' ')

  const handleClick = (e) => {
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
