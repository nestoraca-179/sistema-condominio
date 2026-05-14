import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { background: '#363636', color: '#fff', fontSize: '14px' },
        success: { style: { background: '#16a34a' } },
        error: { style: { background: '#dc2626' } },
      }}
    />
  </React.StrictMode>,
)
