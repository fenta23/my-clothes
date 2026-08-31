import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/reset.css'
import './styles/tokens.css'
import './styles/glass.css'

import { App } from './App.tsx'

const container = document.getElementById('root')
if (!container) throw new Error('Root-Element #root nicht gefunden')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
