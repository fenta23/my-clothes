import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ClothesProvider, useClothes } from './ClothesProvider.tsx'

let dbCounter = 0

/** Kleine Sonde, die den Kontext sichtbar macht und Aktionen ausloest. */
function Probe() {
  const c = useClothes()

  if (!c.ready) return <p>lädt…</p>

  return (
    <div>
      <p data-testid="haushalte">{c.households.map((h) => h.name).join(', ')}</p>
      <p data-testid="kategorien">{c.categories.length}</p>
      <p data-testid="stuecke">{c.items.length}</p>
      <p data-testid="bahnen">
        {c.items.map((i) => `${i.title}:${i.householdId ?? 'neu'}`).join('|')}
      </p>

      <button
        onClick={() =>
          void c.addItem({
            title: 'Jeans',
            categoryId: null,
            householdId: null,
            full: new Blob(['f']),
            thumb: new Blob(['t']),
          })
        }
      >
        hinzufügen
      </button>

      <button
        onClick={() => {
          const first = c.items[0]
          const target = c.households[0]
          if (first && target) void c.moveItem(first.id, target.id)
        }}
      >
        verschieben
      </button>

      <button
        onClick={() => {
          const first = c.items[0]
          if (first) void c.deleteItem(first.id)
        }}
      >
        löschen
      </button>

      <button
        onClick={() => {
          const first = c.households[0]
          if (first) void c.renameHousehold(first.id, 'Bei Mama')
        }}
      >
        umbenennen
      </button>
    </div>
  )
}

function renderProvider() {
  dbCounter += 1
  render(
    <ClothesProvider dbName={`provider-test-${dbCounter}`}>
      <Probe />
    </ClothesProvider>,
  )
}

describe('ClothesProvider', () => {
  it('legt beim ersten Start Haushalte und Kategorien an', async () => {
    renderProvider()

    await waitFor(() =>
      expect(screen.getByTestId('haushalte')).toHaveTextContent('Haushalt 1, Haushalt 2'),
    )
    expect(Number(screen.getByTestId('kategorien').textContent)).toBeGreaterThan(0)
  })

  it('zeigt bis zum Laden einen Zwischenzustand', () => {
    renderProvider()

    expect(screen.getByText('lädt…')).toBeInTheDocument()
  })

  it('nimmt ein neues Kleidungsstueck auf', async () => {
    const user = userEvent.setup()
    renderProvider()
    await screen.findByTestId('stuecke')

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))

    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))
  })

  it('aktualisiert die Anzeige nach einem Wechsel der Bahn', async () => {
    const user = userEvent.setup()
    renderProvider()
    await screen.findByTestId('stuecke')

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))
    await waitFor(() => expect(screen.getByTestId('bahnen')).toHaveTextContent('Jeans:neu'))

    await user.click(screen.getByRole('button', { name: 'verschieben' }))

    // Nach dem Schreiben wird neu gelesen - Anzeige und Datenbank duerfen nicht
    // auseinanderlaufen.
    await waitFor(() =>
      expect(screen.getByTestId('bahnen')).not.toHaveTextContent('Jeans:neu'),
    )
  })

  it('entfernt ein geloeschtes Stueck aus der Anzeige', async () => {
    const user = userEvent.setup()
    renderProvider()
    await screen.findByTestId('stuecke')

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))
    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))

    await user.click(screen.getByRole('button', { name: 'löschen' }))

    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('0'))
  })

  it('uebernimmt einen umbenannten Haushalt sofort', async () => {
    const user = userEvent.setup()
    renderProvider()
    await screen.findByTestId('haushalte')

    await user.click(screen.getByRole('button', { name: 'umbenennen' }))

    await waitFor(() =>
      expect(screen.getByTestId('haushalte')).toHaveTextContent('Bei Mama'),
    )
  })

  it('wirft eine verstaendliche Meldung ausserhalb des Providers', () => {
    // Ohne diese Pruefung wuerde ein Vergessen erst als "null is not an object" auffallen.
    expect(() => render(<Probe />)).toThrow(/ausserhalb von ClothesProvider/)
  })
})
