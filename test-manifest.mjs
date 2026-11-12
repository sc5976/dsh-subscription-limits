/**
 * Manifest smoke test for the subscription-limits bundle.
 *
 * DSH reads package.json with a strict JSON parser, so a UTF-8 BOM makes the
 * package unloadable and the bundle report no rows. This test fails on that,
 * then checks that every file the manifest advertises exists and that the
 * locale cards parse.
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('./', import.meta.url)
const bytes = fs.readFileSync(new URL('./package.json', import.meta.url))

assert.notEqual(
  bytes[0],
  0xef,
  'package.json starts with a UTF-8 BOM; DSH rejects it (Unexpected token). Write it as UTF-8 without a BOM.',
)

const manifest = JSON.parse(bytes.toString('utf8'))

assert.match(manifest.name, /^@local\//, 'the package must stay in the @local scope')
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'version must be a plain semver release')
assert.equal(manifest.type, 'module', 'the bundle is ESM')
assert.ok(manifest.dsh?.bundle?.patch, 'package.json must declare dsh.bundle.patch')
assert.ok(manifest.dsh?.engines?.dsh, 'package.json must declare dsh.engines.dsh')
assert.equal(manifest.dsh?.client?.platform, 'web', 'the bundle targets the web client')

const patch = new URL(manifest.dsh.bundle.patch, root)
assert.ok(fs.existsSync(patch), `bundle patch missing: ${manifest.dsh.bundle.patch}`)

for (const entry of manifest.files ?? []) {
  if (entry.includes('*')) continue
  assert.ok(fs.existsSync(new URL(entry, root)), `files entry missing on disk: ${entry}`)
}

const exports = Object.entries(manifest.exports ?? {})
assert.ok(exports.length > 0, 'package.json must declare exports')
for (const [subpath, target] of exports) {
  if (subpath.includes('*') || target.includes('*')) continue
  assert.ok(fs.existsSync(new URL(target, root)), `export ${subpath} points at a missing file: ${target}`)
}

const localeDir = new URL('./locale/', root)
const localeFiles = fs.readdirSync(localeDir).filter((name) => name.endsWith('.json'))
assert.ok(localeFiles.length >= 9, 'all nine UI languages need a locale card')
for (const name of localeFiles) {
  const card = JSON.parse(fs.readFileSync(new URL(name, localeDir), 'utf8'))
  assert.equal(typeof card.meta?.title, 'string', `${name} needs meta.title`)
}

console.log(`OK: manifest is BOM-free, exports resolve, ${localeFiles.length} locale cards parse`)
