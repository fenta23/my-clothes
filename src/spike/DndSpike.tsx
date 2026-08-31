import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import styles from './DndSpike.module.css'
import {
  cardsInLane,
  createInitialState,
  isLaneId,
  moveCard,
  type LaneId,
  type SpikeCard,
  type SpikeState,
} from './moveLogic.ts'

/*
 * Wegwerf-Prototyp fuer den einzigen Punkt, der sich nicht am Schreibtisch klaeren
 * laesst: Gewinnt Drag & Drop auf iOS gegen das horizontale Scrollen der Bahn?
 *
 * Deshalb sind Verzoegerung, Toleranz und touch-action hier zur Laufzeit umschaltbar -
 * der Spike soll die Frage beantworten, nicht eine Annahme bestaetigen.
 */

const LANE_TITLES: Record<LaneId, string> = {
  top: 'Haushalt A (oben)',
  inbox: 'Neu / unentschieden',
  bottom: 'Haushalt B (unten)',
}

const LANE_COLORS: Record<LaneId, string> = {
  top: 'linear-gradient(140deg, #8b5cf6, #6366f1)',
  inbox: 'linear-gradient(140deg, #f59e0b, #ef4444)',
  bottom: 'linear-gradient(140deg, #10b981, #0ea5e9)',
}

/** Merker, um einen Neustart der Seite waehrend des Kamera-Pickers zu erkennen. */
const CAMERA_PROBE_KEY = 'spike:kameraProbe'

const DELAY_OPTIONS = [0, 150, 250, 400] as const
const TOUCH_ACTION_OPTIONS = ['manipulation', 'none'] as const

type TouchActionOption = (typeof TOUCH_ACTION_OPTIONS)[number]

type CameraVerdict = 'unbekannt' | 'zustand-erhalten' | 'neu-geladen'

function Card({
  card,
  touchAction,
}: {
  card: SpikeCard
  touchAction: TouchActionOption
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      style={{ background: LANE_COLORS[card.lane], touchAction }}
      {...listeners}
      {...attributes}
    >
      {card.label}
    </div>
  )
}

function Lane({
  lane,
  cards,
  touchAction,
}: {
  lane: LaneId
  cards: SpikeCard[]
  touchAction: TouchActionOption
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane })

  return (
    <section
      ref={setNodeRef}
      className={`glass glass--lg ${styles.lane} ${isOver ? styles.laneOver : ''}`}
    >
      <header className={styles.laneHeader}>
        <span>{LANE_TITLES[lane]}</span>
        <span>{cards.length}</span>
      </header>

      {cards.length === 0 ? (
        <p className={styles.empty}>Leer — hier etwas ablegen</p>
      ) : (
        /* pan-x erlaubt der Bahn weiterhin horizontales Scrollen. */
        <div className={styles.scroller} style={{ touchAction: 'pan-x' }}>
          {cards.map((card) => (
            <Card key={card.id} card={card} touchAction={touchAction} />
          ))}
        </div>
      )}
    </section>
  )
}

function Segment<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  format?: (value: T) => string
}) {
  return (
    <div className={styles.segment} role="group">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={option === value}
          className={`${styles.segmentButton} ${
            option === value ? styles.segmentButtonActive : ''
          }`}
          onClick={() => onChange(option)}
        >
          {format ? format(option) : String(option)}
        </button>
      ))}
    </div>
  )
}

export function DndSpike() {
  const [state, setState] = useState<SpikeState>(() => createInitialState())
  const [activeId, setActiveId] = useState<string | null>(null)

  const [delay, setDelay] = useState<number>(250)
  const [touchAction, setTouchAction] = useState<TouchActionOption>('manipulation')

  const [draft, setDraft] = useState('')
  const [cameraVerdict, setCameraVerdict] = useState<CameraVerdict>('unbekannt')
  const cameraInputRef = useRef<HTMLInputElement>(null)

  /*
   * Der Sensor wird ueber `delay` neu erzeugt, damit die Umschaltung sofort wirkt.
   * Bei delay > 0 laesst dnd-kit das Scrollen zu, bis die Verzoegerung abgelaufen ist,
   * und bricht den Drag ab, wenn der Finger vorher weiter als `tolerance` wandert.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint:
        delay > 0 ? { delay, tolerance: 8 } : { distance: 8 },
    }),
  )

  // Lag beim Start ein Kamera-Merker vor, hat die Seite waehrend des Pickers neu geladen.
  useEffect(() => {
    if (sessionStorage.getItem(CAMERA_PROBE_KEY)) {
      sessionStorage.removeItem(CAMERA_PROBE_KEY)
      setCameraVerdict('neu-geladen')
    }
  }, [])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const target = event.over?.id
    if (!isLaneId(target)) return

    setState((current) => moveCard(current, String(event.active.id), target, Date.now()))
  }

  function openCamera() {
    sessionStorage.setItem(CAMERA_PROBE_KEY, String(Date.now()))
    cameraInputRef.current?.click()
  }

  function handleCameraChange() {
    // Dieser Handler laeuft nur, wenn die Seite zwischendurch nicht neu geladen hat.
    sessionStorage.removeItem(CAMERA_PROBE_KEY)
    setCameraVerdict('zustand-erhalten')
  }

  const activeCard = state.cards.find((c) => c.id === activeId) ?? null

  return (
    <div className={styles.screen}>
      <div className="appBackdrop" aria-hidden="true" />

      <header>
        <h1 className={styles.heading}>DnD-Spike</h1>
        <p className={styles.sub}>
          Karte ziehen und in einer anderen Bahn ablegen. Danach pruefen, ob sich die
          Bahn weiterhin horizontal scrollen laesst.
        </p>
      </header>

      <div className={`glass glass--lg ${styles.panel}`}>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Verzoegerung</span>
          <Segment
            options={DELAY_OPTIONS}
            value={delay as (typeof DELAY_OPTIONS)[number]}
            onChange={setDelay}
            format={(ms) => (ms === 0 ? 'sofort' : `${ms} ms`)}
          />
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>touch-action</span>
          <Segment
            options={TOUCH_ACTION_OPTIONS}
            value={touchAction}
            onChange={setTouchAction}
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {(['top', 'inbox', 'bottom'] as const).map((lane) => (
          <Lane
            key={lane}
            lane={lane}
            cards={cardsInLane(state, lane)}
            touchAction={touchAction}
          />
        ))}

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div
              className={`${styles.card} ${styles.cardOverlay}`}
              style={{ background: LANE_COLORS[activeCard.lane] } as CSSProperties}
            >
              {activeCard.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className={`glass glass--lg ${styles.panel}`}>
        <span className={styles.controlLabel}>Kamera-Test</span>
        <p className={styles.sub}>
          Text eintippen, Kamera oeffnen, Foto aufnehmen. Steht der Text danach noch da,
          ueberlebt der Zustand den Picker.
        </p>

        <input
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Testtext…"
        />

        <button type="button" className={styles.button} onClick={openCamera}>
          Kamera oeffnen
        </button>

        <input
          ref={cameraInputRef}
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
        />

        {cameraVerdict === 'neu-geladen' && (
          <p className={`${styles.verdict} ${styles.verdictBad}`}>
            Die App wurde beim Kamera-Aufruf neu geladen. Der Erfassungs-Flow muss den
            Entwurf vorher in IndexedDB sichern.
          </p>
        )}

        {cameraVerdict === 'zustand-erhalten' && (
          <p className={`${styles.verdict} ${styles.verdictGood}`}>
            Zustand erhalten — kein Neuladen. Entwurfs-Sicherung nicht noetig.
          </p>
        )}
      </div>

      <div className={`glass glass--lg ${styles.panel}`}>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Protokoll ({state.history.length})</span>
          <button
            type="button"
            className={styles.buttonGhost}
            onClick={() => setState(createInitialState())}
          >
            Zuruecksetzen
          </button>
        </div>

        {state.history.length === 0 ? (
          <p className={styles.logEmpty}>Noch nichts verschoben.</p>
        ) : (
          <div className={styles.log}>
            {state.history.map((entry) => (
              <span key={`${entry.cardId}-${entry.at}`}>
                {new Date(entry.at).toLocaleTimeString('de-DE')} · {entry.cardId}:{' '}
                {entry.from} → {entry.to}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
