import { useEffect, useState } from 'react'

import { useClothes } from '../data/ClothesProvider.tsx'
import type { Id } from '../data/types.ts'
import { useObjectUrl } from './useObjectUrl.ts'

/**
 * Laedt das Vorschaubild eines Kleidungsstuecks und gibt es als URL zurueck.
 *
 * Bewusst pro Karte und nicht als Vorratsladung fuer alle: bei einem gut
 * gefuellten Schrank haelt man sonst dutzende Fotos gleichzeitig im Speicher.
 * Die zugehoerige Object-URL wird beim Ausblenden wieder freigegeben.
 */
export function useThumbnail(itemId: Id): string | null {
  const { loadImages } = useClothes()
  const [blob, setBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let cancelled = false

    void loadImages(itemId).then((images) => {
      if (!cancelled) setBlob(images?.thumb ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [itemId, loadImages])

  return useObjectUrl(blob)
}
