import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { botpressMiddleware } from './server/botpressMiddleware.js'
import { examMiddleware } from './server/exam/examMiddleware.js'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'botpress-backend-api',
      configureServer(server) {
        server.middlewares.use('/api/botpress', botpressMiddleware);
        server.middlewares.use('/MewTinHoc/api/botpress', botpressMiddleware);
        // API gen đề thi thử — cùng pattern với botpress để dev chạy được
        server.middlewares.use('/api/exams', examMiddleware);
        server.middlewares.use('/MewTinHoc/api/exams', examMiddleware);
      }
    }
  ],
  build: {
    cssMinify: false,
  },
})
