import { useData } from '../hooks/useData'

export default function Footer() {
  const { data: site } = useData('site.json')
  const year = new Date().getFullYear()
  const contact = site?.contact ?? {}

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <img
          src={`${import.meta.env.BASE_URL}images/ewha-emblem.png`}
          alt="이화여자대학교"
          className="footer-emblem"
        />
        <p className="footer-contact">
          {[contact.address, contact.email, contact.phone].filter(Boolean).join('  ·  ')}
        </p>
        <p className="footer-copyright">
          © {year} {site?.labName ?? 'CoRe Lab'}
          {site?.university ? `, ${site.university}` : ''}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
