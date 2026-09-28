import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시: 저장소 이름이 "corelab-homepage"가 아니라면
// 아래 REPO_NAME을 실제 저장소 이름으로 바꿔주세요.
// 학교 커스텀 도메인(corelab.ewha.ac.kr) 연결 후에는 base를 '/'로 바꾸고
// public/CNAME 파일을 추가하면 됩니다. (README 참고)
const REPO_NAME = 'corelab-homepage'

/**
 * 배포 주소(https://... 전체 URL)를 자동으로 알아냅니다.
 *   1) VITE_SITE_URL 환경변수가 있으면 그 값
 *   2) public/CNAME(커스텀 도메인)이 있으면 https://<도메인><base>
 *   3) GitHub Actions에서 빌드하면 https://<계정>.github.io<base>
 * 커스텀 도메인을 연결해도 CNAME 파일만 추가하면 알아서 바뀌므로 따로 고칠 필요가 없습니다.
 * index.html의 %SITE_URL%, robots.txt/sitemap.xml 생성이 모두 이 함수 하나를 같이 씁니다.
 */
function resolveSiteUrl(base) {
  let url = process.env.VITE_SITE_URL ?? ''
  if (!url && existsSync('public/CNAME')) {
    url = `https://${readFileSync('public/CNAME', 'utf8').trim()}${base}`
  }
  if (!url && process.env.GITHUB_REPOSITORY_OWNER) {
    url = `https://${process.env.GITHUB_REPOSITORY_OWNER.toLowerCase()}.github.io${base}`
  }
  if (url && !url.endsWith('/')) url += '/'
  return url || base
}

/**
 * 카카오톡·페이스북 등 링크 미리보기(og:image)는 "https://..."로 시작하는 전체 주소만 인식합니다.
 * index.html의 %SITE_URL% 자리를 실제 배포 주소로 채워 넣습니다.
 */
function siteUrlPlugin() {
  let base = '/'
  return {
    name: 'corelab-site-url',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', resolveSiteUrl(base))
    },
  }
}

// 검색엔진에 노출할 실제 페이지 목록. 새 메뉴(페이지)가 생기면 여기에도 추가해주세요.
// (App.jsx의 ROUTES와 맞춰둡니다. 관리자 전용/임시 페이지는 넣지 않습니다.)
const SITEMAP_ROUTES = [
  { hash: '', priority: '1.0' }, // 홈(About)
  { hash: '#/news', priority: '0.8' },
  { hash: '#/research', priority: '0.8' },
  { hash: '#/people', priority: '0.8' },
  { hash: '#/lablife', priority: '0.6' },
]

/**
 * 빌드 결과물에 robots.txt와 sitemap.xml을 만들어 넣습니다.
 * (해시(#/...) 기반 SPA라 검색엔진이 각 페이지를 별도 주소로 인식하지 못할 수 있지만,
 *  홈 주소는 확실히 알려주고, 하시 주소들도 참고용으로 함께 적어둡니다.)
 */
function seoFilesPlugin() {
  let base = '/'
  return {
    name: 'corelab-seo-files',
    configResolved(config) {
      base = config.base
    },
    generateBundle() {
      const siteUrl = resolveSiteUrl(base)
      const today = new Date().toISOString().slice(0, 10)

      const urls = SITEMAP_ROUTES.map(
        ({ hash, priority }) => `  <url>
    <loc>${siteUrl}${hash}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`,
      ).join('\n')

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
      const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin(), seoFilesPlugin()],
  base: process.env.VITE_BASE ?? `/${REPO_NAME}/`,
})
