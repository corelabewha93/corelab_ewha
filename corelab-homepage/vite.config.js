import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시: 저장소 이름이 "corelab-homepage"가 아니라면
// 아래 REPO_NAME을 실제 저장소 이름으로 바꿔주세요.
// (public/CNAME 파일이 있으면 배포 워크플로가 base를 자동으로 '/'로 바꿔줍니다.)
const REPO_NAME = 'corelab-homepage'

// 빌드(배포)할 때마다 달라지는 번호. 아래 세 곳에 쓰입니다.
//  1) 화면 코드 안(__BUILD_ID__) : 지금 열려 있는 화면이 어느 배포본인지
//  2) version.json               : 서버에 올라가 있는 "가장 최신" 배포본 번호
//  3) index.html의 %BUILD_ID%     : 링크 미리보기 이미지 주소 끝에 붙여, 카카오톡이 옛날 이미지를 붙들고 있지 못하게 함
// 폰 브라우저가 옛날 화면을 붙들고 있으면 (1)과 (2)가 달라서, 화면이 스스로 새로고침합니다.
const BUILD_ID = Date.now().toString(36)

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
      return html.replaceAll('%SITE_URL%', resolveSiteUrl(base)).replaceAll('%BUILD_ID%', BUILD_ID)
    },
  }
}

// 검색엔진에 노출할 실제 페이지 목록. 새 메뉴(페이지)가 생기면 여기에도 추가해주세요.
// (App.jsx의 ROUTES와 맞춰둡니다. 관리자 전용/임시 페이지는 넣지 않습니다.)
const SITEMAP_ROUTES = [
  { path: '', priority: '1.0' }, // 홈(About)
  { path: 'news', priority: '0.8' },
  { path: 'research', priority: '0.8' },
  { path: 'people', priority: '0.8' },
  { path: 'lablife', priority: '0.6' },
]

/**
 * 빌드 결과물에 robots.txt와 sitemap.xml을 만들어 넣습니다.
 * (주소가 해시(#/...)가 아니라 진짜 경로라서, 검색엔진이 각 페이지를 정확히 구분해서 색인할 수 있습니다.)
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
        ({ path, priority }) => `  <url>
    <loc>${siteUrl}${path}</loc>
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
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin(), seoFilesPlugin()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  base: process.env.VITE_BASE ?? `/${REPO_NAME}/`,
})
