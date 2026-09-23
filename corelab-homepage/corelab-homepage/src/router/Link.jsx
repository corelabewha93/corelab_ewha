import { useHashRoute } from './useHashRoute'

/** <a href="#/news">처럼 동작하되, 현재 경로와 일치하면 active 클래스를 붙여줍니다. */
export default function Link({ to, children, className = '', ...rest }) {
  const { path } = useHashRoute()
  const targetPath = to.split('?')[0]
  const isActive = path === targetPath
  const classes = [className, isActive ? 'active' : ''].filter(Boolean).join(' ')

  return (
    <a href={`#${to}`} className={classes} {...rest}>
      {children}
    </a>
  )
}
