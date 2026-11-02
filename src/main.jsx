import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { installViewportHeight } from './lib/viewportHeight'

// Đo chiều cao vùng nhìn thấy thật -> biến CSS `--app-vh` (sửa lỗi modal bị
// header/footer trình duyệt che trên điện thoại).
installViewportHeight()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)