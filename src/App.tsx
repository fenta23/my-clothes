import { Wardrobe } from './components/Wardrobe.tsx'
import { UpdateBanner } from './components/UpdateBanner.tsx'
import { ClothesProvider } from './data/ClothesProvider.tsx'
import { requestPersistentStorage } from './lib/platform.ts'
import { useAppUpdate } from './lib/useAppUpdate.ts'

/*
 * Der Speicher wird einmal beim Start als dauerhaft angefordert. Safari gewaehrt
 * das nicht garantiert, deshalb wird das Ergebnis protokolliert statt angenommen -
 * und deshalb gibt es zusaetzlich den Export als Sicherung.
 */
void requestPersistentStorage().then((result) => {
  console.info('[Speicher] dauerhaft:', result)
})

export function App() {
  const update = useAppUpdate()

  return (
    <ClothesProvider>
      <Wardrobe />

      {update.needRefresh && (
        <UpdateBanner onReload={update.reload} onDismiss={update.dismiss} />
      )}
    </ClothesProvider>
  )
}
