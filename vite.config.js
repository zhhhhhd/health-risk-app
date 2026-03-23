import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 部署时的子路径，需与仓库名一致
  // 如果仓库名不是 health-risk-app，请修改此处
  base: '/health-risk-app/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5199,
  },
})