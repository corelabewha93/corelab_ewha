import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시: 저장소 이름이 "corelab-homepage"가 아니라면
// 아래 REPO_NAME을 실제 저장소 이름으로 바꿔주세요.
// 학교 커스텀 도메인(corelab.ewha.ac.kr) 연결 후에는 base를 '/'로 바꾸고
// public/CNAME 파일을 추가하면 됩니다. (README 참고)
const REPO_NAME = 'corelab-homepage'

/**
 * 카카오톡·페이스북 등 링크 미리보기(og:image)는 "https://..."로 시작하는 전체 주소만 인식합니다.
 * 배포 주소를 자동으로 알아내서 index.html의 %SITE_URL% 자리에 채워 넣습니다.
 *   1) VITE_SITE_URL 환경변수가 있으면 그 값
 *   2) public/CNAME(커스텀 도메인)이 있으면 https://<도메인><base>
 *   3) GitHub Actions에서 빌드하면 https://<계정>.github.io<base>
 * 커스텀 도메인을 연결해도 CNAME 파일만 추가하면 알아서 바뀌므로 따로 고칠 필요가 없습니다.
 */
function siteUrlPlugin() {
  let base = '/'
  return {
    name: 'corelab-site-url',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml(html) {
      let url = process.env.VITE_SITE_URL ?? ''
      if (!url && existsSync('public/CNAME')) {
        url = `https://${readFileSync('public/CNAME', 'utf8').trim()}${base}`
      }
      if (!url && process.env.GITHUB_REPOSITORY_OWNER) {
        url = `https://${process.env.GITHUB_REPOSITORY_OWNER.toLowerCase()}.github.io${base}`
      }
      if (url && !url.endsWith('/')) url += '/'
      return html.replaceAll('%SITE_URL%', url || base)
    },
  }
}

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  base: process.env.VITE_BASE ?? `/${REPO_NAME}/`,
})
