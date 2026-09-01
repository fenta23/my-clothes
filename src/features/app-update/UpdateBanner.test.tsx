import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UpdateBanner } from './UpdateBanner.tsx'

describe('UpdateBanner', () => {
  it('meldet die neue Fassung', () => {
    render(<UpdateBanner onReload={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByText('Neue Version verfügbar')).toBeInTheDocument()
  })

  it('wird von Screenreadern angesagt, ohne die Bedienung zu unterbrechen', () => {
    render(<UpdateBanner onReload={vi.fn()} onDismiss={vi.fn()} />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })

  it('laedt erst auf Zuruf neu', async () => {
    const onReload = vi.fn()
    const user = userEvent.setup()
    render(<UpdateBanner onReload={onReload} onDismiss={vi.fn()} />)

    // Von selbst neu zu laden wuerde ein gerade aufgenommenes Foto verwerfen.
    expect(onReload).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Neu laden' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('sperrt den Knopf nach dem Antippen gegen Doppelklicks', async () => {
    const onReload = vi.fn()
    const user = userEvent.setup()
    render(<UpdateBanner onReload={onReload} onDismiss={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Neu laden' })
    await user.click(button)

    expect(button).toBeDisabled()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()

    await user.click(button)
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('laesst sich ausblenden', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<UpdateBanner onReload={vi.fn()} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Hinweis ausblenden' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
