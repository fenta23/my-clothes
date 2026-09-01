/**
 * Die Icons der Oberflaeche - alle aus einer Quelle.
 *
 * Bewusst unter eigenen, zweckgebundenen Namen: `IconPrivacy` sagt, wofuer es steht,
 * `ShieldCheck` nur, wie es aussieht. Ein Wechsel des Bildes oder der Bibliothek
 * betrifft damit diese Datei und nicht dreizehn Aufrufstellen.
 *
 * Nicht hier: die Symbole der Kategorien. Die sind Daten und bleiben frei waehlbare
 * Emoji - Lucide deckt von unseren neun Startkategorien nur T-Shirt und Schuhe ab,
 * und fuer selbst erfundene Kategorien gibt es dort ohnehin nichts.
 */
export {
  Menu as IconMenu,
  X as IconClose,
  ChevronLeft as IconBack,
  ChevronRight as IconForward,
  ArrowUp as IconMoveUp,
  ArrowDown as IconMoveDown,
  Settings as IconSettings,
  ShieldCheck as IconPrivacy,
  Info as IconImprint,
  Plus as IconAdd,
  Camera as IconCamera,
  Images as IconGallery,
  Trash2 as IconDelete,
  Shirt as IconClothing,
  Download as IconExport,
  Upload as IconImport,
  RefreshCw as IconUpdate,
} from 'lucide-react'
