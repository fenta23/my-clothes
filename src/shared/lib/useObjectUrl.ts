import { useEffect, useState } from 'react'

/**
 * Macht einen Blob als URL fuer `<img>` verfuegbar und raeumt sie wieder ab.
 *
 * Ohne das `revokeObjectURL` im Cleanup haelt der Browser jedes je angezeigte Foto
 * im Speicher - bei einer scrollenden Bahn voller Bilder faellt das schnell auf.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }

    const next = URL.createObjectURL(blob)
    setUrl(next)

    return () => {
      URL.revokeObjectURL(next)
    }
  }, [blob])

  return url
}
