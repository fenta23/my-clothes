import { ClothesProvider } from './data/ClothesProvider.tsx'
import { Wardrobe } from './components/Wardrobe.tsx'
import { requestPersistentStorage } from './lib/platform.ts'

/*
 * Der Speicher wird einmal beim Start als dauerhaft angefordert. Safari gewaehrt
 * das nicht garantiert, deshalb wird das Ergebnis protokolliert statt angenommen -
 * und deshalb gibt es zusaetzlich den Export als Sicherung.
 */
void requestPersistentStorage().then((result) => {
  console.info('[Speicher] dauerhaft:', result)
})

export function App() {
  return (
    <ClothesProvider>
      <Wardrobe />
    </ClothesProvider>
  )
}
