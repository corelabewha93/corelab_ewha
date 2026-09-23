import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시: 저장소 이름이 "corelab-homepage"가 아니라면
// 아래 REPO_NAME을 실제 저장소 이름으로 바꿔주세요.
// 학교 커스텀 도메인(corelab.ewha.ac.kr) 연결 후에는 base를 '/'로 바꾸고
// public/CNAME 파일을 추가하면 됩니다. (README 참고)
const REPO_NAME = 'corelab-homepage'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? `/${REPO_NAME}/`,
})
