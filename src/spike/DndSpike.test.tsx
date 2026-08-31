import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DndSpike } from './DndSpike.tsx'

beforeEach(() => {
  sessionStorage.clear()
})

describe('DndSpike', () => {
  it('zeigt alle drei Bahnen mit gleicher Kartenzahl', () => {
    render(<DndSpike />)

    for (const title of ['Haushalt A (oben)', 'Neu / unentschieden', 'Haushalt B (unten)']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }

    // createInitialState verteilt standardmaessig 8 Karten je Bahn.
    expect(screen.getAllByText('8')).toHaveLength(3)
  })

  it('startet mit 250 ms Verzoegerung und touch-action manipulation', () => {
    render(<DndSpike />)

    expect(screen.getByRole('button', { name: '250 ms' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'manipulation' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('schaltet die Verzoegerung um', async () => {
    const user = userEvent.setup()
    render(<DndSpike />)

    await user.click(screen.getByRole('button', { name: 'sofort' }))

    expect(screen.getByRole('button', { name: 'sofort' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '250 ms' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('meldet ein Neuladen, wenn beim Start noch ein Kamera-Merker liegt', () => {
    sessionStorage.setItem('spike:kameraProbe', '1700000000000')

    render(<DndSpike />)

    expect(screen.getByText(/neu geladen/i)).toBeInTheDocument()
    // Der Merker muss verbraucht sein, sonst meldet jeder weitere Start dasselbe.
    expect(sessionStorage.getItem('spike:kameraProbe')).toBeNull()
  })

  it('meldet ohne Merker keinen Kamera-Befund', () => {
    render(<DndSpike />)

    expect(screen.queryByText(/neu geladen/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Zustand erhalten/i)).not.toBeInTheDocument()
  })

  it('setzt den Merker beim Oeffnen der Kamera', async () => {
    const user = userEvent.setup()
    render(<DndSpike />)

    await user.click(screen.getByRole('button', { name: /Kamera oeffnen/i }))

    expect(sessionStorage.getItem('spike:kameraProbe')).not.toBeNull()
  })

  it('startet mit leerem Protokoll', () => {
    render(<DndSpike />)

    expect(screen.getByText('Noch nichts verschoben.')).toBeInTheDocument()
    expect(screen.getByText('Protokoll (0)')).toBeInTheDocument()
  })
})
