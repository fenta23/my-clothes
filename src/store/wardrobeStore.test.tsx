import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { StoreProvider, useWardrobe, useWardrobeStore } from './StoreProvider.tsx'
import {
  selectCategories,
  selectHouseholds,
  selectItems,
  selectOutfits,
  selectStatus,
} from './selectors.ts'

let counter = 0

/** Zaehlt, wie oft eine Komponente gerendert wurde. */
const renders = { categories: 0, items: 0, outfits: 0 }

function CategoriesProbe() {
  const categories = useWardrobe(selectCategories)
  renders.categories += 1

  return <p data-testid="kategorien">{categories.length}</p>
}

function ItemsProbe() {
  const items = useWardrobe(selectItems)
  renders.items += 1

  return <p data-testid="stuecke">{items.length}</p>
}

function OutfitsProbe() {
  const outfits = useWardrobe(selectOutfits)
  renders.outfits += 1

  return <p data-testid="outfits">{outfits.map((o) => o.name).join(', ')}</p>
}

function Actions() {
  const store = useWardrobeStore()
  const households = useWardrobe(selectHouseholds)
  const items = useWardrobe(selectItems)

  return (
    <div>
      <p data-testid="haushalte">{households.map((h) => h.name).join(', ')}</p>
      <p data-testid="bahnen">
        {items.map((i) => `${i.title}:${i.householdId ?? 'neu'}`).join('|')}
      </p>

      <button
        onClick={() =>
          void store.addItem({
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
          const first = items[0]
          const target = households[0]
          if (first && target) void store.moveItem(first.id, target.id)
        }}
      >
        verschieben
      </button>

      <button
        onClick={() => {
          const first = items[0]
          if (first) void store.deleteItem(first.id)
        }}
      >
        löschen
      </button>

      <button
        onClick={() => {
          const first = households[0]
          if (first) void store.renameHousehold(first.id, 'Bei Mama')
        }}
      >
        umbenennen
      </button>

      <button
        onClick={() => {
          const first = items[0]
          void store.addOutfit({ name: 'Schultag', itemIds: first ? [first.id] : [] })
        }}
      >
        outfit anlegen
      </button>
    </div>
  )
}

function Ready({ children }: { children: React.ReactNode }) {
  const status = useWardrobe(selectStatus)

  return status === 'bereit' ? <>{children}</> : <p>lädt…</p>
}

function renderApp() {
  counter += 1
  renders.categories = 0
  renders.items = 0
  renders.outfits = 0

  render(
    <StoreProvider dbName={`store-test-${counter}`}>
      <Ready>
        <CategoriesProbe />
        <ItemsProbe />
        <OutfitsProbe />
        <Actions />
      </Ready>
    </StoreProvider>,
  )
}

describe('Kleiderschrank-Store', () => {
  it('legt beim ersten Start Haushalte und Kategorien an', async () => {
    renderApp()

    await waitFor(() =>
      expect(screen.getByTestId('haushalte')).toHaveTextContent('Haushalt 1, Haushalt 2'),
    )
    expect(Number(screen.getByTestId('kategorien').textContent)).toBeGreaterThan(0)
  })

  it('zeigt bis zum Laden einen Zwischenzustand', () => {
    renderApp()

    expect(screen.getByText('lädt…')).toBeInTheDocument()
  })

  it('nimmt ein neues Kleidungsstueck auf', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByTestId('stuecke')

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))

    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))
  })

  it('rendert bei einem neuen Foto NICHT die Kategorienliste neu', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByTestId('stuecke')

    const categoriesBefore = renders.categories
    const itemsBefore = renders.items

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))
    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))

    /*
     * Das ist der Grund fuer den ganzen Umbau: vorher hing jede Komponente am
     * gemeinsamen Context, und ein einziges neues Foto rendert die gesamte
     * Oberflaeche neu - inklusive jeder Karte.
     */
    expect(renders.items).toBeGreaterThan(itemsBefore)
    expect(renders.categories).toBe(categoriesBefore)
  })

  it('rendert bei einem neuen Foto NICHT die Outfit-Liste neu', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByTestId('outfits')

    const outfitsBefore = renders.outfits

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))
    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))

    // Dieselbe Zusicherung wie bei den Kategorien - der zweite Bildschirm darf die
    // Trennung nicht wieder aufweichen.
    expect(renders.outfits).toBe(outfitsBefore)
  })

  it('nimmt ein Outfit auf und entfernt ein geloeschtes Stueck daraus', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByTestId('stuecke')

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))
    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))

    await user.click(screen.getByRole('button', { name: 'outfit anlegen' }))
    await waitFor(() => expect(screen.getByTestId('outfits')).toHaveTextContent('Schultag'))

    await user.click(screen.getByRole('button', { name: 'löschen' }))

    // Das Outfit bleibt, sein Verweis auf das geloeschte Stueck nicht.
    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('0'))
    expect(screen.getByTestId('outfits')).toHaveTextContent('Schultag')
  })

  it('aktualisiert die Anzeige nach einem Wechsel der Bahn', async () => {
    const user = userEvent.setup()
    renderApp()
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
    renderApp()
    await screen.findByTestId('stuecke')

    await user.click(screen.getByRole('button', { name: 'hinzufügen' }))
    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('1'))

    await user.click(screen.getByRole('button', { name: 'löschen' }))

    await waitFor(() => expect(screen.getByTestId('stuecke')).toHaveTextContent('0'))
  })

  it('uebernimmt einen umbenannten Haushalt sofort', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByTestId('haushalte')

    await user.click(screen.getByRole('button', { name: 'umbenennen' }))

    await waitFor(() => expect(screen.getByTestId('haushalte')).toHaveTextContent('Bei Mama'))
  })

  it('wirft eine verstaendliche Meldung ausserhalb des Providers', () => {
    // Ohne diese Pruefung wuerde ein Vergessen erst als "null is not an object" auffallen.
    expect(() => render(<CategoriesProbe />)).toThrow(/ausserhalb von StoreProvider/)
  })
})
