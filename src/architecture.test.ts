// @vitest-environment node

import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Erzwingt die Abhaengigkeitsrichtung.
 *
 * Ohne Zwang verfaellt jede Struktur wieder: es genuegt ein bequemer Import, und die
 * Trennung ist stillschweigend weg. oxlint bringt keine Regel fuer Pfadgrenzen mit,
 * also pruefen wir es hier - das braucht kein Plugin und laeuft in der CI mit.
 *
 * Die Schichten von unten nach oben:
 *
 *   shared    generische Bausteine, kennt die Fachlichkeit nicht
 *   entities  Fachtypen und ihre Ablage in IndexedDB
 *   store     der gemeinsame Zustand, verbindet mehrere Entitaeten
 *   features  fachliche Bausteine der Oberflaeche
 *   app       setzt die Features zusammen und kennt als einziger alle
 *
 * Importe zeigen ausschliesslich nach unten. Zusaetzlich gilt: ein Feature darf kein
 * anderes Feature kennen - sonst waeren es keine Slices, sondern nur Ordner.
 */

const SRC = resolve(import.meta.dirname)

const LAYERS = ['shared', 'entities', 'store', 'features', 'app'] as const
type Layer = (typeof LAYERS)[number]

const RANK: Record<Layer, number> = {
  shared: 0,
  entities: 1,
  store: 2,
  features: 3,
  app: 4,
}

interface SourceFile {
  /** Pfad relativ zu src, z. B. "features/wardrobe/Lane.tsx". */
  path: string
  layer: Layer
  /** Nur bei features gesetzt, z. B. "wardrobe". */
  slice: string | null
  imports: string[]
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await collectFiles(full)))
    else if (/\.tsx?$/.test(entry.name)) files.push(full)
  }

  return files
}

function layerOf(relativePath: string): Layer | null {
  const first = relativePath.split('/')[0]

  return LAYERS.includes(first as Layer) ? (first as Layer) : null
}

/** Zieht alle relativen Importpfade aus einer Datei. */
function importsOf(absolutePath: string): string[] {
  const source = readFileSync(absolutePath, 'utf8')
  const pattern = /(?:from|import)\s+['"](\.[^'"]+)['"]/g

  return [...source.matchAll(pattern)].map((match) => match[1]!)
}

/** Loest einen relativen Import zu einem Pfad relativ zu src auf. */
function resolveImport(fromFile: string, specifier: string): string {
  return relative(SRC, resolve(join(SRC, fromFile), '..', specifier)).replaceAll('\\', '/')
}

const files: SourceFile[] = (await collectFiles(SRC))
  .map((absolute) => {
    const path = relative(SRC, absolute).replaceAll('\\', '/')
    const layer = layerOf(path)
    if (!layer) return null

    const segments = path.split('/')

    return {
      path,
      layer,
      slice: layer === 'features' ? (segments[1] ?? null) : null,
      imports: importsOf(absolute),
    }
  })
  .filter((file): file is SourceFile => file !== null)

describe('Aufbau', () => {
  it('findet ueberhaupt Quelldateien', () => {
    // Schlaegt eine Umbenennung die Erkennung tot, waeren alle Regeln stumm gruen.
    expect(files.length).toBeGreaterThan(30)
    for (const layer of LAYERS) {
      expect(files.some((f) => f.layer === layer), `Schicht ${layer} ist leer`).toBe(true)
    }
  })

  it('kennt jede Datei genau einer Schicht zu', () => {
    const stray = files.filter((f) => !LAYERS.includes(f.layer))

    expect(stray.map((f) => f.path)).toEqual([])
  })

  it('importiert nur nach unten', () => {
    const violations: string[] = []

    for (const file of files) {
      for (const specifier of file.imports) {
        const target = resolveImport(file.path, specifier)
        const targetLayer = layerOf(target)
        if (!targetLayer) continue

        if (RANK[targetLayer] > RANK[file.layer]) {
          violations.push(`${file.path} → ${target} (${file.layer} darf nicht ${targetLayer})`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('laesst kein Feature ein anderes Feature kennen', () => {
    const violations: string[] = []

    for (const file of files) {
      if (file.layer !== 'features' || !file.slice) continue

      for (const specifier of file.imports) {
        const target = resolveImport(file.path, specifier)
        if (!target.startsWith('features/')) continue

        const targetSlice = target.split('/')[1]
        if (targetSlice && targetSlice !== file.slice) {
          violations.push(`${file.path} → ${target}`)
        }
      }
    }

    // Zusammengesetzt wird in `app` - nur dort darf man alle Features kennen.
    expect(violations).toEqual([])
  })

  it('haelt shared frei von Fachlichkeit', () => {
    const violations = files
      .filter((f) => f.layer === 'shared')
      .flatMap((f) =>
        f.imports
          .map((specifier) => resolveImport(f.path, specifier))
          .filter((target) => layerOf(target) !== null && layerOf(target) !== 'shared')
          .map((target) => `${f.path} → ${target}`),
      )

    expect(violations).toEqual([])
  })
})
