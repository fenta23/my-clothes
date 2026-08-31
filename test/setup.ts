import '@testing-library/jest-dom/vitest'

// jsdom bringt keine IndexedDB mit. fake-indexeddb registriert eine vollstaendige
// In-Memory-Implementierung global, sodass der Data-Layer im Test echt laeuft
// statt gemockt zu werden.
import 'fake-indexeddb/auto'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom implementiert matchMedia nicht. Ohne diesen Stub wirft jede Komponente,
// die auf display-mode oder prefers-color-scheme reagiert.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  cleanup()
})
