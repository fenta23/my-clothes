import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StoreProvider } from '../../store/StoreProvider.tsx'
import { AddClothingSheet } from './AddClothingSheet.tsx'

/*
 * `processImageFile` braucht createImageBitmap und Canvas - beides gibt es in jsdom
 * nicht. Die Groessenrechnung dahinter ist in images.test.ts fuer sich geprueft;
 * hier interessiert nur der Ablauf des Formulars.
 */
vi.mock('./images.ts', () => ({
  processImageFile: vi.fn(async () => ({
    full: new Blob(['full'], { type: 'image/jpeg' }),
    thumb: new Blob(['thumb'], { type: 'image/jpeg' }),
    size: { width: 1600, height: 1200 },
  })),
}))

import { processImageFile } from './images.ts'

let dbCounter = 0

function renderSheet(onClose = vi.fn()) {
  dbCounter += 1

  render(
    <StoreProvider dbName={`sheet-test-${dbCounter}`}>
      <AddClothingSheet onClose={onClose} />
    </StoreProvider>,
  )

  return { onClose }
}

/** Waehlt ein Foto aus und wartet, bis das Formular erscheint. */
async function pickPhoto(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(['x'], 'hose.jpg', { type: 'image/jpeg' })
  await user.upload(screen.getByTestId('galerie-input'), file)

  await screen.findByLabelText('Name (optional)')
}

beforeEach(() => {
  vi.mocked(processImageFile).mockClear()
  // jsdom kennt keine Object-URLs.
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})

describe('AddClothingSheet', () => {
  it('fragt zuerst nach dem Foto, nicht nach den Angaben', () => {
    renderSheet()

    // Reihenfolge ist Absicht: der Kamera-Picker kann die Seite neu laden.
    expect(screen.getByText('Schritt 1 — Foto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Foto aufnehmen/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aus Galerie/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Name (optional)')).not.toBeInTheDocument()
  })

  it('bietet getrennte Eingaben fuer Kamera und Galerie an', () => {
    renderSheet()

    // Nur der Kamera-Pfad traegt capture - sonst oeffnet iOS die falsche Ansicht.
    expect(screen.getByTestId('kamera-input')).toHaveAttribute('capture', 'environment')
    expect(screen.getByTestId('galerie-input')).not.toHaveAttribute('capture')
  })

  it('zeigt nach der Auswahl das Formular mit Vorschau', async () => {
    const user = userEvent.setup()
    renderSheet()

    await pickPhoto(user)

    expect(processImageFile).toHaveBeenCalledTimes(1)
    expect(screen.getByAltText(/Vorschau/)).toBeInTheDocument()
  })

  it('zeigt die Kategorien aus der Datenbank', async () => {
    const user = userEvent.setup()
    renderSheet()
    await pickPhoto(user)

    expect(await screen.findByRole('button', { name: /Hose/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /T-Shirt/ })).toBeInTheDocument()
  })

  it('steht standardmaessig auf "Noch offen"', async () => {
    const user = userEvent.setup()
    renderSheet()
    await pickPhoto(user)

    // Neue Stuecke landen in der mittleren Bahn - die Entscheidung trifft das Kind.
    expect(screen.getByRole('button', { name: 'Noch offen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('erlaubt das Abwaehlen einer Kategorie durch erneutes Antippen', async () => {
    const user = userEvent.setup()
    renderSheet()
    await pickPhoto(user)

    const hose = await screen.findByRole('button', { name: /Hose/ })

    await user.click(hose)
    expect(hose).toHaveAttribute('aria-pressed', 'true')

    await user.click(hose)
    expect(hose).toHaveAttribute('aria-pressed', 'false')
  })

  it('legt eine neue Kategorie an und zeigt sie sofort an', async () => {
    const user = userEvent.setup()
    renderSheet()
    await pickPhoto(user)

    await user.type(screen.getByLabelText('Neue Kategorie'), 'Mütze')
    await user.click(screen.getByRole('button', { name: 'Anlegen' }))

    expect(await screen.findByRole('button', { name: /Mütze/ })).toBeInTheDocument()
    // Das Eingabefeld wird geleert, damit nicht versehentlich doppelt angelegt wird.
    expect(screen.getByLabelText('Neue Kategorie')).toHaveValue('')
  })

  it('legt keine Kategorie ohne Namen an', async () => {
    const user = userEvent.setup()
    renderSheet()
    await pickPhoto(user)

    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeDisabled()
  })

  it('speichert und schliesst das Sheet', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()
    await pickPhoto(user)

    await user.type(screen.getByLabelText('Name (optional)'), 'Lieblingshose')
    await user.click(await screen.findByRole('button', { name: /Hose/ }))
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('kehrt ueber "Anderes Foto" zur Auswahl zurueck', async () => {
    const user = userEvent.setup()
    renderSheet()
    await pickPhoto(user)

    await user.click(screen.getByRole('button', { name: 'Anderes Foto' }))

    expect(screen.getByText('Schritt 1 — Foto')).toBeInTheDocument()
  })

  it('meldet einen Fehler bei der Bildverarbeitung, statt still zu scheitern', async () => {
    vi.mocked(processImageFile).mockRejectedValueOnce(new Error('kaputt'))

    const user = userEvent.setup()
    renderSheet()

    await user.upload(
      screen.getByTestId('galerie-input'),
      new File(['x'], 'kaputt.jpg', { type: 'image/jpeg' }),
    )

    expect(await screen.findByText(/konnte nicht verarbeitet werden/)).toBeInTheDocument()
  })

  it('schliesst beim Tippen neben das Sheet', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(screen.getByRole('presentation'))

    expect(onClose).toHaveBeenCalled()
  })

  it('schliesst nicht beim Tippen im Sheet selbst', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(within(screen.getByRole('dialog')).getByText('Neues Kleidungsstück'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
