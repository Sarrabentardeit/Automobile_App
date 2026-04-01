import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// En cas de version frontend périmée en cache (chunk introuvable), on force un reload propre.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
