import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { botpressMiddleware } from './server/botpressMiddleware.js'
import { examMiddleware } from './server/exam/examMiddleware.js'
import { aiMiddleware } from './server/ai/aiMiddleware.js'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'botpress-backend-api',
      configureServer(server) {
        server.middlewares.use('/api/botpress', botpressMiddleware);
        // API gen đề thi thử — cùng pattern với botpress để dev chạy được
        server.middlewares.use('/api/exams', examMiddleware);
        // API đánh giá của AI (Gemini) — khoá chỉ nằm ở server
        server.middlewares.use('/api/ai', aiMiddleware);
      }
    }
  ],
  build: {
    cssMinify: true,
  },
})
