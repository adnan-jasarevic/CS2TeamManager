import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import '@fontsource-variable/inter/wght.css'
import '@fontsource/zen-kaku-gothic-new/latin-700.css'
import '@fontsource/zen-kaku-gothic-new/latin-900.css'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/theme-provider'
import { ToastProvider } from './components/ui/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* Follows the OS "reduce motion" setting for every animation in the app. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <App />
        </ToastProvider>
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>,
)
