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

  it('startet ohne Verzoegerung und mit touch-action pan-x', () => {
    render(<DndSpike />)

    // pan-x laesst den Browser nach Richtung entscheiden: waagerecht scrollt die
    // Bahn, senkrecht startet den Drag. Damit entfaellt das Stillhalten.
    expect(screen.getByRole('button', { name: 'sofort' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'pan-x' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('schaltet die Verzoegerung um', async () => {
    const user = userEvent.setup()
    render(<DndSpike />)

    await user.click(screen.getByRole('button', { name: '250 ms' }))

    expect(screen.getByRole('button', { name: '250 ms' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'sofort' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('bietet ohne Auswahl keine Ablage-Schaltflaeche an', () => {
    render(<DndSpike />)

    expect(screen.queryByRole('button', { name: 'hierhin' })).not.toBeInTheDocument()
  })

  it('verschiebt eine Karte per Antippen in eine andere Bahn', async () => {
    const user = userEvent.setup()
    render(<DndSpike />)

    await user.click(screen.getByText('I1', { exact: true }))

    // Nur fremde Bahnen bieten die Ablage an, die eigene nicht.
    const dropButtons = screen.getAllByRole('button', { name: 'hierhin' })
    expect(dropButtons).toHaveLength(2)

    await user.click(dropButtons[0]!)

    expect(screen.getByText('Protokoll (1)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'hierhin' })).not.toBeInTheDocument()
  })

  it('hebt die Auswahl beim erneuten Antippen wieder auf', async () => {
    const user = userEvent.setup()
    render(<DndSpike />)

    const card = screen.getByText('I1', { exact: true })
    await user.click(card)
    expect(screen.getAllByRole('button', { name: 'hierhin' })).toHaveLength(2)

    await user.click(card)
    expect(screen.queryByRole('button', { name: 'hierhin' })).not.toBeInTheDocument()
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
