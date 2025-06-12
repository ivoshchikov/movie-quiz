// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'   // ⬅️ Tailwind CSS (обязательно до подключения компонентов)
import App from './App'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
