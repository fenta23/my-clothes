import { UpdateBanner } from '../features/app-update/UpdateBanner.tsx'
import { useAppUpdate } from '../features/app-update/useAppUpdate.ts'
import { requestPersistentStorage } from '../shared/lib/platform.ts'
import { StoreProvider } from '../store/StoreProvider.tsx'
import { Shell } from './Shell.tsx'

/*
 * Der Speicher wird einmal beim Start als dauerhaft angefordert. Safari gewaehrt das
 * nicht garantiert, deshalb wird das Ergebnis protokolliert statt angenommen - und
 * deshalb gibt es zusaetzlich den Export als Sicherung.
 */
void requestPersistentStorage().then((result) => {
  console.info('[Speicher] dauerhaft:', result)
})

export function App() {
  const update = useAppUpdate()

  return (
    <StoreProvider>
      <Shell />

      {update.needRefresh && (
        <UpdateBanner onReload={update.reload} onDismiss={update.dismiss} />
      )}
    </StoreProvider>
  )
}
