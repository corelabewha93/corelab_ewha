import { useData } from '../hooks/useData'

export default function Footer() {
  const { data } = useData('site.json')
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          © {year} {data?.labName ?? 'CoreLab'}
          {data?.university ? `, ${data.university}` : ''}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
