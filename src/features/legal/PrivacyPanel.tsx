import {
  CONTACT_EMAIL,
  CONTROLLER_NAME,
  isControllerConfigured,
} from './controller.ts'
import styles from './legal.module.css'

/**
 * Datenschutzerklaerung.
 *
 * Sie ist so kurz, weil die App tatsaechlich so wenig tut: kein Konto, kein Server,
 * kein einziger Aufruf an einen Fremdserver zur Laufzeit (geprueft: kein `fetch`,
 * keine externen Skripte, Systemschriften). Der einzige Auftragsverarbeiter ist der
 * Hoster.
 *
 * Sollte spaeter eine Synchronisation dazukommen, gehoert hier ein eigener Abschnitt
 * hin - dann verlassen Daten erstmals das Geraet, und genau das ist die Aussage, die
 * sich damit aendert.
 */
export function PrivacyPanel() {
  return (
    <div className={styles.panel} data-testid="datenschutz-panel">
      <p className={styles.lead}>
        <strong>Grundsatz:</strong> Diese App funktioniert vollständig ohne Konto und
        setzt <strong>keine Cookies, kein Tracking, keine Analyse-Werkzeuge und keine
        Werbung</strong> ein. Die Fotos deiner Kleidung verlassen dein Gerät nicht — es
        gibt keinen Server, an den sie gesendet würden.
      </p>

      {!isControllerConfigured() && (
        <p className={styles.warning} data-testid="datenschutz-warnung">
          Der Verantwortliche ist nicht hinterlegt. Beim Bauen muss
          <code> VITE_CONTROLLER_NAME </code> gesetzt sein.
        </p>
      )}

      <div>
        <p className={styles.heading}>Verantwortlicher</p>
        <p>
          {CONTROLLER_NAME} · Kontakt:{' '}
          <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className={styles.note}>im Sinne des Art. 4 Nr. 7 DSGVO</p>
      </div>

      <div>
        <p className={styles.heading}>Welche Daten verarbeitet werden</p>
        <ul className={styles.list}>
          <li>
            <strong>Fotos, Kategorien, Haushalte und Verlauf</strong> — ausschließlich
            lokal im Speicher deines Browsers (IndexedDB). Diese Daten werden nirgendwohin
            übertragen und sind für den Betreiber dieser App nicht einsehbar.
          </li>
          <li>
            <strong>Kamera und Fotogalerie</strong> — nur nach ausdrücklicher Freigabe
            durch dein Gerät. Das ausgewählte Bild wird lokal verkleinert und lokal
            gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
          </li>
          <li>
            <strong>IP-Adresse</strong> — beim Abruf der App technisch unvermeidbar und
            wird vom Hoster in Zugriffsprotokollen verarbeitet. Es entstehen keine
            Nutzungsprofile. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
          </li>
        </ul>
      </div>

      <div>
        <p className={styles.heading}>Eingesetzte Dienste</p>
        <ul className={styles.list}>
          <li>
            <a
              className={styles.link}
              href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener"
            >
              GitHub Pages
            </a>{' '}
            (GitHub Inc., USA) — Auslieferung der App; verarbeitet Zugriffsprotokolle
            einschließlich IP-Adresse.
          </li>
        </ul>
        <p className={styles.note}>
          Weitere Dienste werden nicht eingesetzt. Insbesondere werden keine Schriftarten,
          Karten oder Skripte von Fremdservern nachgeladen.
        </p>
      </div>

      <div>
        <p className={styles.heading}>Drittlandübermittlung</p>
        <p>
          GitHub Inc. sitzt in den USA. Die Übermittlung erfolgt auf Basis des EU-US Data
          Privacy Framework beziehungsweise der EU-Standardvertragsklauseln.
        </p>
      </div>

      <div>
        <p className={styles.heading}>Speicherdauer</p>
        <p>
          Die lokalen Daten bleiben, bis du sie löschst. Du entfernst sie vollständig,
          indem du die App vom Home-Bildschirm löschst beziehungsweise die Website-Daten
          in den Browser-Einstellungen leerst.
        </p>
      </div>

      <div>
        <p className={styles.heading}>Deine Rechte</p>
        <p>
          Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und
          Widerspruch (Art. 15–21 DSGVO) sowie Beschwerde bei einer Aufsichtsbehörde. Für
          die Datenübertragbarkeit gibt es in den Einstellungen einen vollständigen Export
          als ZIP-Datei. Es findet keine automatisierte Entscheidungsfindung und keine
          Profilbildung statt.
        </p>
      </div>
    </div>
  )
}
