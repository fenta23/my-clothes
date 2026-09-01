import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  formatBytes,
  getStorageUsage,
  isIos,
  isStandalone,
  requestPersistentStorage,
} from './platform.ts'

/** Ersetzt eine Navigator-Property fuer die Dauer eines Tests. */
function stubNavigator(props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    vi.stubGlobal('navigator', { ...navigator, [key]: value })
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isStandalone', () => {
  it('erkennt den iOS-Standalone-Modus ueber navigator.standalone', () => {
    stubNavigator({ standalone: true })

    expect(isStandalone()).toBe(true)
  })

  it('erkennt den Standalone-Modus ueber die display-mode Media Query', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    )

    expect(isStandalone()).toBe(true)
  })

  it('meldet false im normalen Browser-Tab', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    )

    expect(isStandalone()).toBe(false)
  })
})

describe('isIos', () => {
  it('erkennt ein iPhone am User-Agent', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)' })

    expect(isIos()).toBe(true)
  })

  it('erkennt iPadOS, das sich als Macintosh ausgibt', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })

    expect(isIos()).toBe(true)
  })

  it('meldet false auf einem echten Mac ohne Touch', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    })

    expect(isIos()).toBe(false)
  })
})

describe('requestPersistentStorage', () => {
  it('meldet fehlende Unterstuetzung, statt zu werfen', async () => {
    vi.stubGlobal('navigator', {})

    expect(await requestPersistentStorage()).toEqual({ supported: false, persisted: false })
  })

  it('fragt nicht erneut, wenn der Speicher bereits dauerhaft ist', async () => {
    const persist = vi.fn()
    vi.stubGlobal('navigator', {
      storage: { persist, persisted: vi.fn().mockResolvedValue(true) },
    })

    expect(await requestPersistentStorage()).toEqual({ supported: true, persisted: true })
    expect(persist).not.toHaveBeenCalled()
  })

  it('gibt eine Ablehnung durch Safari unveraendert weiter', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persist: vi.fn().mockResolvedValue(false),
        persisted: vi.fn().mockResolvedValue(false),
      },
    })

    expect(await requestPersistentStorage()).toEqual({ supported: true, persisted: false })
  })

  it('faengt einen Fehler der Storage-API ab', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persist: vi.fn().mockRejectedValue(new Error('kaputt')),
        persisted: vi.fn().mockResolvedValue(false),
      },
    })

    expect(await requestPersistentStorage()).toEqual({ supported: true, persisted: false })
  })
})

describe('getStorageUsage', () => {
  it('liefert Belegung und Kontingent', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 1234, quota: 999_000 }) },
    })

    expect(await getStorageUsage()).toEqual({ usageBytes: 1234, quotaBytes: 999_000 })
  })

  it('liefert null, wenn der Browser keine Schaetzung anbietet', async () => {
    vi.stubGlobal('navigator', {})

    expect(await getStorageUsage()).toBeNull()
  })

  it('liefert null bei unvollstaendiger Antwort', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 10 }) },
    })

    expect(await getStorageUsage()).toBeNull()
  })
})

describe('formatBytes', () => {
  it('zeigt kleine Werte in Byte', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('rechnet in KB und MB um', () => {
    expect(formatBytes(2048)).toBe('2,0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5,0 MB')
  })

  it('laesst bei dreistelligen Werten die Nachkommastelle weg', () => {
    expect(formatBytes(700 * 1024 * 1024)).toBe('700 MB')
  })

  it('steigt bis Gigabyte auf', () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe('3,0 GB')
  })
})
