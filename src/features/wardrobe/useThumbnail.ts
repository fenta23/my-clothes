import { useEffect, useState } from 'react'

import { useWardrobeStore } from '../../store/StoreProvider.tsx'
import type { Id } from '../../shared/db/ids.ts'
import { useObjectUrl } from '../../shared/lib/useObjectUrl.ts'

/**
 * Laedt das Vorschaubild eines Kleidungsstuecks und gibt es als URL zurueck.
 *
 * Bewusst pro Karte und nicht als Vorratsladung fuer alle: bei einem gut gefuellten
 * Schrank haelt man sonst dutzende Fotos gleichzeitig im Speicher. Die zugehoerige
 * Object-URL wird beim Ausblenden wieder freigegeben.
 *
 * Greift nur auf die Store-Referenz zu, nicht auf seinen Zustand - eine Karte soll
 * nicht neu rendern, nur weil anderswo ein Foto hinzugekommen ist.
 */
export function useThumbnail(itemId: Id): string | null {
  const store = useWardrobeStore()
  const [blob, setBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let cancelled = false

    void store.loadImages(itemId).then((images) => {
      if (!cancelled) setBlob(images?.thumb ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [itemId, store])

  return useObjectUrl(blob)
}
