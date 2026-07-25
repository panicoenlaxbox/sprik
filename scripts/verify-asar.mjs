/* eslint-disable @typescript-eslint/explicit-function-return-type */
// Verifies that the packaged app.asar contains the full production dependency
// closure: every dependency declared by a packaged module must itself be
// packaged. This catches the class of bug that shipped a broken 0.3.3
// ("Cannot find module 'ms'"), where electron-builder omitted a transitive
// dependency. Runs in CI after the build and before the release step, so a
// broken artifact never gets published. Exits non-zero (failing the job) when
// anything is missing.

import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadAsar() {
  try {
    return require('@electron/asar')
  } catch {
    // Under pnpm, @electron/asar is a transitive dep of electron-builder and is
    // not hoisted to the top-level node_modules; resolve it from the store.
    const store = 'node_modules/.pnpm'
    const dir = readdirSync(store).find((d) => d.startsWith('@electron+asar@'))
    if (!dir) throw new Error('cannot locate @electron/asar in the pnpm store')
    return require(resolve(store, dir, 'node_modules/@electron/asar'))
  }
}

function findAsar() {
  const candidates = [
    'dist/win-unpacked/resources/app.asar',
    'dist/linux-unpacked/resources/app.asar'
  ]
  const found = candidates.find((c) => existsSync(c))
  if (!found) {
    throw new Error(`app.asar not found in any of: ${candidates.join(', ')}`)
  }
  return found
}

const asar = loadAsar()
const asarPath = findAsar()
const files = asar.listPackage(asarPath).map((f) => f.replace(/\\/g, '/'))

// Set of every package present in the asar, including nested ones.
const packaged = new Set()
const pkgRe = /node_modules\/((?:@[^/]+\/)?[^/]+)/g
for (const f of files) {
  let m
  while ((m = pkgRe.exec(f)) !== null) packaged.add(m[1])
}

// Every package.json inside the asar, plus the app's own root manifest.
const manifestPaths = files.filter(
  (f) => f === 'package.json' || /node_modules\/(?:@[^/]+\/)?[^/]+\/package.json$/.test(f)
)

const readJson = (p) => JSON.parse(asar.extractFile(asarPath, p).toString('utf8'))

const missing = []
for (const mp of manifestPaths) {
  let json
  try {
    json = readJson(mp)
  } catch {
    continue
  }
  const deps = json.dependencies ?? {}
  const optional = json.optionalDependencies ?? {}
  for (const dep of Object.keys(deps)) {
    if (dep in optional) continue // optional deps may legitimately be absent
    if (!packaged.has(dep)) {
      missing.push(`${json.name ?? mp} -> ${dep}`)
    }
  }
}

console.log(`verify-asar: ${asarPath}`)
console.log(`verify-asar: ${packaged.size} packages, ${manifestPaths.length} manifests checked`)

if (missing.length > 0) {
  console.error(`verify-asar: FAIL - ${missing.length} missing dependency(ies):`)
  for (const m of [...new Set(missing)].sort()) console.error(`  ${m}`)
  process.exit(1)
}

console.log('verify-asar: OK - production dependency closure is complete')
