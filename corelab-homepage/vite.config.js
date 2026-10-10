import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
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

/**
 * 링크 미리보기(카카오톡·문자·슬랙 등)용 페이지를 메뉴마다, 소식마다 따로 만들어 둡니다.
 *
 * 카카오톡은 링크를 받으면 그 주소의 HTML만 읽고(화면 코드를 실행하지 않음) og:image·og:title을 봅니다.
 * 그런데 이 사이트는 한 장짜리 앱이라 원래는 모든 주소가 같은 index.html(홈 미리보기)이거나,
 * /news처럼 직접 들어오면 404 페이지를 거쳐 열려서 미리보기가 아예 안 떴습니다.
 *
 * 그래서 빌드할 때 index.html을 복사해 미리보기 정보만 바꾼 파일을 만듭니다.
 *   dist/news/index.html, dist/research/index.html, dist/people/index.html, dist/lablife/index.html
 *   dist/news/<소식id>/index.html  ← 소식 제목 + 그 소식의 첫 사진
 * 화면은 index.html과 똑같이 열리므로 방문자가 보는 것은 달라지지 않습니다.
 * 관리자 화면에서 소식을 올리면 자동 배포 때 그 소식의 페이지도 새로 만들어집니다. (숨긴 소식은 만들지 않음)
 */
const PREVIEW_PAGES = [
  { path: 'news', title: 'News | CoRe Lab', desc: '이화여자대학교 교육공학과 CoRe Lab의 연구 성과 · 수상 · 활동 소식', image: 'images/og/og-news.png', alt: 'CoRe Lab News — 연구실 소식' },
  { path: 'research', title: 'Research | CoRe Lab', desc: 'CoRe Lab의 논문 · 학위논문 · 연구과제 · 특허 — 협력학습(CSCL), 학습분석학, 협력적 문제해결', image: 'images/og/og-research.png', alt: 'CoRe Lab Research — 연구' },
  { path: 'people', title: 'People | CoRe Lab', desc: 'CoRe Lab의 지도교수 · 재학생 · 졸업생을 소개합니다.', image: 'images/og/og-people.png', alt: 'CoRe Lab People — 구성원' },
  { path: 'lablife', title: 'Lab Life | CoRe Lab', desc: '함께 공부하고 함께 나눈 CoRe Lab의 시간들', image: 'images/og/og-lablife.png', alt: 'CoRe Lab Lab Life — 연구실 생활' },
]

const escAttr = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (t, n) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s
}

function setMetaTag(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[:.]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`)
  return html.replace(re, () => `<meta ${attr}="${key}" content="${escAttr(value)}" />`)
}
function dropMetaTag(html, attr, key) {
  const re = new RegExp(`\\s*<meta\\s+${attr}="${key.replace(/[:.]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`)
  return html.replace(re, '')
}

function previewHtml(html, siteUrl, pg) {
  const url = `${siteUrl}${pg.path}`
  let out = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escAttr(pg.title)}</title>`)
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, () => `<link rel="canonical" href="${escAttr(url)}" />`)
  out = setMetaTag(out, 'name', 'description', pg.desc)
  out = setMetaTag(out, 'property', 'og:type', pg.type ?? 'website')
  out = setMetaTag(out, 'property', 'og:url', url)
  out = setMetaTag(out, 'property', 'og:title', pg.title)
  out = setMetaTag(out, 'property', 'og:description', pg.desc)
  out = setMetaTag(out, 'property', 'og:image', pg.imageUrl)
  out = setMetaTag(out, 'property', 'og:image:alt', pg.alt ?? pg.title)
  if (pg.photo) {
    // 소식 사진은 크기가 제각각이라 가로·세로 크기 표시는 빼 둡니다 (카카오톡이 사진을 직접 재서 맞춥니다).
    out = dropMetaTag(out, 'property', 'og:image:width')
    out = dropMetaTag(out, 'property', 'og:image:height')
  }
  out = setMetaTag(out, 'name', 'twitter:title', pg.title)
  out = setMetaTag(out, 'name', 'twitter:description', pg.desc)
  out = setMetaTag(out, 'name', 'twitter:image', pg.imageUrl)
  return out
}

function linkPreviewPagesPlugin() {
  let base = '/'
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'corelab-link-preview-pages',
    apply: 'build',
    configResolved(config) {
      base = config.base
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const indexPath = join(outDir, 'index.html')
      if (!existsSync(indexPath)) return
      const html = readFileSync(indexPath, 'utf8')
      const siteUrl = resolveSiteUrl(base)
      const abs = (p) => (/^https?:\/\//.test(p) ? p : `${siteUrl}${encodeURI(String(p).replace(/^\/+/, ''))}`)
      const pages = PREVIEW_PAGES.map((pg) => ({ ...pg, imageUrl: `${abs(pg.image)}?v=${BUILD_ID}` }))

      let news = []
      try {
        news = JSON.parse(readFileSync(join(root, 'public/data/news.json'), 'utf8'))
      } catch {
        news = []
      }
      ;(Array.isArray(news) ? news : []).forEach((n) => {
        // 숨긴 소식, 주소로 쓸 수 없는 id는 건너뜁니다 (그런 소식도 사이트에서는 그대로 열립니다).
        if (!n || n.hidden || !/^[A-Za-z0-9._-]+$/.test(n.id ?? '') || n.id.startsWith('.')) return
        const photo = (Array.isArray(n.images) && n.images.find(Boolean)) || n.thumbnail || n.image || ''
        const firstLine = (Array.isArray(n.body) ? n.body : [n.body]).find((l) => l && !/^\s*\[/.test(l)) ?? ''
        pages.push({
          path: `news/${n.id}`,
          type: 'article',
          title: `${clip(n.title, 90)} | CoRe Lab`,
          desc: clip(n.subtitle || n.summary || firstLine || 'CoRe Lab 소식', 120),
          imageUrl: photo ? abs(photo) : `${abs('images/og/og-news.png')}?v=${BUILD_ID}`,
          photo: Boolean(photo),
          alt: clip(n.title, 90),
        })
      })

      pages.forEach((pg) => {
        const dir = join(outDir, pg.path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), previewHtml(html, siteUrl, pg))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin(), seoFilesPlugin(), linkPreviewPagesPlugin()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  base: process.env.VITE_BASE ?? `/${REPO_NAME}/`,
})
