#!/usr/bin/env node
// VERIFY AN ISSUED ASPERN REPORT, AS A CUSTOMER OR AN AUDITOR WOULD.
// First written 2026-11-08 (DD audit 9.0); rewritten 2026-11-24 for the external DD audit §5: five statuses kept apart,
// a missing key reported as unverified rather than valid or invalid, an offline key bundle with pinned fingerprints,
// the published signed bytes checked, and the published test vectors runnable.
//
// Node 18 or later. No dependencies, no build: download it and run it.
//   https://aspern.org/verify-report.mjs   (the same file as tools/verify-report.mjs in the source)
//
//   node verify-report.mjs <folder-or-pdf> [--keys keys.json] [--keys-url URL] [--pin <sha256-hex>]... [--offline] [--json]
//   node verify-report.mjs --vectors [evidence-test-vectors.json | URL]
//
// For each report (a PDF beside its .readings.json, .manifest.json and .pdf-attestation.json):
//   hash_matches             SHA-256 of the readings FILE BYTES = manifest.dataDigest; SHA-256 of the PDF = attestation.pdfSha256;
//                            the attestation names the same readings as the manifest.
//   signature_valid_for_key  Ed25519 over the signed bytes, with the key the document names by kid. Never "pass" for a
//                            document whose hash did not match: that signature is over another file.
//   key_trusted_archived     the key is in the archive, not revoked, valid at the signing time, and matches --pin.
//   report_not_revoked       the report is not listed as revoked or superseded in the key set's `revocations`.
//   data_accuracy            always not_independently_verified: no check here says the readings are true.
//   origin_established       established only with every signature valid, every key trusted at signing and the key
//                            pinned (--pin) from a copy obtained another way; otherwise unverified, with the reason.
//                            A known but untrusted key reads "signature valid, origin unverified".
// A key set that cannot be fetched or read gives signature_unverified:key_unavailable, never valid or invalid.
//
// THE SIGNED BYTES. The manifest signature covers the UTF-8 bytes of the canonical JSON of `manifest`, the attestation
// signature those of `attestation`; v2 documents publish that text beside the signature as `signedBytes`, and this
// script checks it equals its own canonical form. Canonical JSON: keys sorted by UTF-16 code units, no whitespace,
// undefined dropped, strings and numbers exactly as ECMAScript JSON.stringify writes them. The READINGS are never
// re-serialised: their digest is over the file as delivered (Python's json.dumps writes 1.493231643952987e-05 where the
// file has 0.00001493231643952987, so a re-serialised copy hashes differently).
//
// KEYS. By default from https://aspern.org/api/v1/evidence-keys, never from a URL inside the files being checked.
// A key fetched from aspern.org proves the signature matches the key aspern.org presents; for independent trust pin
// its fingerprint (--pin) from a copy obtained another way, or pass a saved bundle with --keys.
//
// Exit: 0 valid, 1 invalid (a check failed), 2 incomplete (files missing), 3 unverified (key unavailable).
import { createHash, createPublicKey, verify } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_KEYS_URL = 'https://aspern.org/api/v1/evidence-keys'
export const DEFAULT_VECTORS_URL = 'https://aspern.org/evidence-test-vectors.json'
export const KEY_UNAVAILABLE = 'signature_unverified:key_unavailable'
export const UNKNOWN_KID = 'fail:unknown_kid'
/** What a valid signature means, and what it does not (2026-11-24 vault DD audit §3). */
export const SIGNATURE_VALID_MEANS = 'The signature matches the named public key; origin is established only if the key was independently authenticated and valid at signing. A valid signature does not prove the figures are true, complete or current.'

/** What a valid signature establishes about origin, and what it does not (2026-11-25 vault DD re-audit §8). */
export const ORIGIN_SCOPE_SAYS = 'The signature matches the named public key; origin is established only if the key was independently authenticated and valid at signing.'
/**
 * THE SCOPE OF TRUST, AS ITS OWN STATUS (re-audit §8: "známý ale nedůvěryhodný klíč: signature valid, origin unverified").
 * established only where every signature verifies, every key is trusted at signing, and the key was pinned from a copy
 * obtained another way; a key known but untrusted, or taken from the publisher alone, leaves origin unverified.
 */
export function originOf(checks, pins) {
  const sig = checks.filter((c) => c.group === 'signature_valid_for_key').map((c) => c.status)
  const trust = checks.filter((c) => c.group === 'key_trusted_archived').map((c) => c.status)
  if (!sig.length) return { origin: 'incomplete', trustScope: 'signature not checked: no signed document' }
  if (sig.some((s) => s === KEY_UNAVAILABLE)) return { origin: 'unknown:key_unavailable', trustScope: 'signature not checked, origin unverified: the key could not be had' }
  if (!sig.every((s) => s === 'pass')) return { origin: 'not_applicable:signature_not_valid', trustScope: 'signature not valid for these files' }
  if (trust.some((s) => s !== 'pass')) return { origin: 'unverified:key_not_trusted', trustScope: 'signature valid, origin unverified: the key is known but not trusted at signing (revoked, outside its validity, or not the key you pinned)' }
  if (!pins.length) return { origin: 'unverified:key_not_independently_authenticated', trustScope: 'signature valid, origin unverified: the key was taken from the publisher; pin its fingerprint from a copy obtained another way to establish origin' }
  return { origin: 'established', trustScope: 'signature valid, origin established: a key you pinned independently, unrevoked and valid at signing' }
}

/** Keys sorted at every depth by UTF-16 code units, no whitespace, undefined dropped: packages/shared/src/report-digest.ts. */
export function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined || typeof x === 'function' ? 'null' : canonicalJson(x))).join(',')}]`
  return `{${Object.keys(v)
    .filter((k) => v[k] !== undefined && typeof v[k] !== 'function')
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`)
    .join(',')}}`
}
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
export const keyFingerprint = (x) => sha256(Buffer.from(x, 'base64url'))
const unwrap = (j) => (j && typeof j === 'object' && j.data && typeof j.data === 'object' && !j.manifest && !j.attestation ? j.data : j)

/** A key set document (the API answer, its envelope, or the offline bundle) as { keys: Map, revocations, source }. */
export function keySetOf(raw, source) {
  const body = unwrap(raw)
  const list = Array.isArray(body) ? body : body?.keys
  if (!Array.isArray(list)) throw new Error('no keys array in the key set')
  return { keys: new Map(list.map((k) => [k.kid, k])), revocations: Array.isArray(body.revocations) ? body.revocations : null, source }
}

/** The key set, or { error } where it cannot be had: that is key_unavailable, not a failure. */
export async function loadKeySet({ keysPath = null, keysUrl = DEFAULT_KEYS_URL, offline = false } = {}) {
  try {
    if (keysPath) return keySetOf(JSON.parse(readFileSync(keysPath, 'utf8')), keysPath)
    if (offline) return { error: 'offline and no --keys bundle given' }
    const res = await fetch(keysUrl, { redirect: 'follow', signal: AbortSignal.timeout(15_000), headers: { accept: 'application/json' } })
    if (!res.ok) return { error: `${keysUrl} answered ${res.status}` }
    return keySetOf(await res.json(), keysUrl)
  } catch (e) {
    return { error: `could not read the key set: ${e?.message ?? e}` }
  }
}

function signatureCheck(set, doc, signature, publishedBytes) {
  const bytes = canonicalJson(doc)
  if (publishedBytes != null && publishedBytes !== bytes) return { status: 'fail', detail: 'the published signedBytes are not the canonical form of the document beside them' }
  if (!set || set.error) return { status: KEY_UNAVAILABLE, detail: set?.error ?? 'no key set' }
  const k = set.keys.get(doc.kid)
  /* The key set was read and holds no such kid (2026-11-24 vault DD audit §3, "neznámý key"): not unavailable, refused. */
  if (!k) return { status: UNKNOWN_KID, detail: `the key set at ${set.source} holds no key with kid ${doc.kid}` }
  try {
    const pub = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: k.x }, format: 'jwk' })
    return verify(null, Buffer.from(bytes, 'utf8'), pub, Buffer.from(String(signature ?? ''), 'base64url'))
      ? { status: 'pass', detail: `Ed25519 over ${Buffer.byteLength(bytes)} bytes, key ${doc.kid}` }
      : { status: 'fail', detail: 'the signature does not verify over the signed bytes with this key' }
  } catch (e) {
    return { status: 'fail', detail: `could not verify: ${e?.message ?? e}` }
  }
}

function keyTrust(set, kid, signedAt, pins) {
  if (!set || set.error) return { status: 'unknown:key_unavailable', detail: set?.error ?? 'no key set' }
  const k = set.keys.get(kid)
  if (!k) return { status: 'fail', detail: `kid ${kid} is not in the archive at ${set.source}` }
  const fp = keyFingerprint(k.x)
  if (k.fingerprintSha256 && k.fingerprintSha256 !== fp) return { status: 'fail', detail: `the archive's fingerprint for ${kid} does not match its key` }
  if (pins.length && !pins.includes(fp)) return { status: 'fail', detail: `fingerprint ${fp} is not one you pinned` }
  if (k.status === 'revoked') return { status: 'fail', detail: `key ${kid} is revoked${k.revokedAt ? ` since ${k.revokedAt}` : ''}${k.revocationReason ? `: ${k.revocationReason}` : ''}` }
  const t = Date.parse(signedAt ?? '')
  if (k.validFrom && Number.isFinite(t) && t < Date.parse(k.validFrom)) return { status: 'fail', detail: `signed at ${signedAt}, before the key was valid (${k.validFrom})` }
  const until = k.validTo ?? k.validUntil
  if (until && Number.isFinite(t) && t > Date.parse(until)) return { status: 'fail', detail: `signed at ${signedAt}, after the key stopped signing (${until})` }
  return { status: 'pass', detail: `${kid} ${k.status ?? 'active'}, fingerprint ${fp}${pins.length ? ' (pinned)' : ''}, from ${set.source}` }
}

const worst = (xs, order) => xs.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a), order[0])

/**
 * One report set. `files` holds Buffers for readings and pdf, parsed JSON for manifest and attestation (either may be
 * absent). `set` is a key set, or { error } / null where none could be had. Returns the five statuses and a verdict.
 */
export function verifyReportSet(files, set, { pins = [] } = {}) {
  const checks = []
  const add = (group, name, status, detail) => checks.push({ group, name, status, detail })
  const signed = files.manifest ? unwrap(files.manifest) : null
  const att = files.attestation ? unwrap(files.attestation) : null
  const missing = ['readings', 'pdf', 'manifest', 'attestation'].filter((k) => !files[k])

  let readingsOk = null
  if (signed?.manifest && files.readings) {
    const d = sha256(files.readings)
    readingsOk = d === signed.manifest.dataDigest
    add('hash_matches', 'readings file bytes = manifest dataDigest', readingsOk ? 'pass' : 'fail', readingsOk ? d : `${d} against ${signed.manifest.dataDigest}`)
  }
  let pdfOk = null
  if (att?.attestation && files.pdf) {
    const p = sha256(files.pdf)
    pdfOk = p === att.attestation.pdfSha256
    add('hash_matches', 'PDF bytes = attestation pdfSha256', pdfOk ? 'pass' : 'fail', pdfOk ? p : `${p} against ${att.attestation.pdfSha256}`)
  }
  if (signed?.manifest && att?.attestation) {
    const same = att.attestation.dataDigest === signed.manifest.dataDigest
    add('hash_matches', 'attestation names the same readings', same ? 'pass' : 'fail', same ? '' : `${att.attestation.dataDigest} against ${signed.manifest.dataDigest}`)
  }
  for (const [name, doc, sig, bytes, hashOk, at] of [
    ['manifest', signed?.manifest, signed?.signature, signed?.signedBytes, readingsOk, signed?.manifest?.signedAt],
    ['attestation', att?.attestation, att?.signature, att?.signedBytes, pdfOk, att?.attestation?.attestedAt],
  ]) {
    if (!doc) continue
    const s = signatureCheck(set, doc, sig, bytes)
    /* T19: a signature over a document whose file did not match is not reported valid; it is over another file. */
    if (hashOk === false && s.status === 'pass') add('signature_valid_for_key', `${name} signature`, 'not_applicable:hash_mismatch', 'the signature verifies, but over a document naming another file than the one you hold')
    else add('signature_valid_for_key', `${name} signature`, s.status, s.detail)
    const k = keyTrust(set, doc.kid, at, pins)
    add('key_trusted_archived', `${name} key ${doc.kid}`, k.status, k.detail)
  }
  const digest = signed?.manifest?.dataDigest ?? att?.attestation?.dataDigest ?? null
  if (!set || set.error || !set.revocations) add('report_not_revoked', 'revocation list', set && !set.error ? 'unknown:no_revocation_list' : 'unknown:key_unavailable', set?.error ?? 'the key set carries no revocations list')
  else {
    const r = digest ? set.revocations.find((x) => x.dataDigest === digest) : null
    add('report_not_revoked', 'revocation list', r ? 'fail' : 'pass', r ? `${r.kind ?? 'revoked'} at ${r.at}${r.supersededBy ? `, superseded by ${r.supersededBy}` : ''}: ${r.reason ?? ''}` : `not listed in ${set.source}`)
  }

  const of = (g) => checks.filter((c) => c.group === g).map((c) => c.status)
  const HASH = ['pass', 'fail']
  const SIG = ['pass', KEY_UNAVAILABLE, 'not_applicable:hash_mismatch', UNKNOWN_KID, 'fail']
  const TRUST = ['pass', 'unknown:key_unavailable', 'fail']
  const REV = ['pass', 'unknown:no_revocation_list', 'unknown:key_unavailable', 'fail']
  const statuses = {
    hash_matches: of('hash_matches').length ? worst(of('hash_matches'), HASH) : 'incomplete',
    signature_valid_for_key: of('signature_valid_for_key').length ? worst(of('signature_valid_for_key'), SIG) : 'incomplete',
    key_trusted_archived: of('key_trusted_archived').length ? worst(of('key_trusted_archived'), TRUST) : 'incomplete',
    report_not_revoked: worst(of('report_not_revoked'), REV),
    data_accuracy: 'not_independently_verified',
  }
  const { origin, trustScope } = originOf(checks, pins)
  statuses.origin_established = origin
  const failed = checks.some((c) => c.status === 'fail' || c.status === UNKNOWN_KID || c.status === 'not_applicable:hash_mismatch')
  const verdict = failed ? 'invalid' : checks.some((c) => c.status === KEY_UNAVAILABLE || c.status === 'unknown:key_unavailable') ? 'unverified' : missing.length ? 'incomplete' : 'valid'
  return { verdict, statuses, missing, checks, dataDigest: digest, trustScope }
}

export const EXIT = { valid: 0, invalid: 1, incomplete: 2, unverified: 3 }

const VERDICT_SAYS = {
  valid: `every check passed: the files are unchanged and their signatures match an archived, unrevoked key valid at the signing time (see report_not_revoked for whether the report itself was withdrawn, and origin_established for the scope of trust). ${SIGNATURE_VALID_MEANS}`,
  invalid: 'a check FAILED: do not rely on these files as issued by ASPERN.',
  incomplete: 'every check run passed, but some files were missing.',
  unverified: `${KEY_UNAVAILABLE}: the hashes were checked but the key set could not be had, so no signature was confirmed or refuted.`,
}

async function runVectors(where) {
  const raw = where && existsSync(where) ? readFileSync(where, 'utf8') : await (await fetch(where || DEFAULT_VECTORS_URL, { signal: AbortSignal.timeout(15_000) })).text()
  const v = JSON.parse(raw)
  let bad = 0
  const line = (ok, name, why = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `: ${why}`}`)
    if (!ok) bad++
  }
  console.log('canonical JSON')
  for (const c of v.canonical ?? []) {
    const got = canonicalJson(JSON.parse(c.input))
    line(got === c.canonical && sha256(Buffer.from(got, 'utf8')) === c.sha256, c.name, `got ${got}`)
  }
  console.log('readings bytes')
  for (const c of v.readingsBytes ?? []) {
    const bytes = Buffer.from(c.fileBase64, 'base64')
    line(sha256(bytes) === c.sha256 && (c.reserialisedSha256 == null || sha256(Buffer.from(c.reserialisedBase64, 'base64')) === c.reserialisedSha256), c.name)
  }
  console.log('signatures')
  for (const c of v.signatures ?? []) {
    const pub = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: c.publicKeyX }, format: 'jwk' })
    const ok = verify(null, Buffer.from(c.signedBytes, 'utf8'), pub, Buffer.from(c.signature, 'base64url'))
    line(ok === c.valid && canonicalJson(c.document) === c.signedBytes && keyFingerprint(c.publicKeyX) === c.fingerprintSha256, c.name)
  }
  console.log('report sets')
  for (const c of v.reportSets ?? []) {
    const files = {
      readings: c.files.readingsBase64 != null ? Buffer.from(c.files.readingsBase64, 'base64') : null,
      pdf: c.files.pdfBase64 != null ? Buffer.from(c.files.pdfBase64, 'base64') : null,
      manifest: c.files.manifest ?? null,
      attestation: c.files.attestation ?? null,
    }
    const set = c.keySet ? keySetOf(c.keySet, 'test vector key set') : { error: 'test vector: key unavailable' }
    const r = verifyReportSet(files, set, { pins: c.pins ?? [] })
    const want = c.expect
    const diff = Object.entries(want).filter(([k, x]) => (k === 'verdict' ? r.verdict : r.statuses[k]) !== x)
    line(diff.length === 0, `${c.name}${c.test ? ` (${c.test})` : ''}`, diff.map(([k, x]) => `${k} ${k === 'verdict' ? r.verdict : r.statuses[k]}, expected ${x}`).join('; '))
  }
  console.log(`\n${bad ? `${bad} vector(s) FAILED` : 'every test vector passed'}.`)
  return bad ? 1 : 0
}

async function main(argv) {
  const opt = { keys: null, keysUrl: DEFAULT_KEYS_URL, pins: [], offline: false, json: false, vectors: null, target: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--keys') opt.keys = argv[++i]
    else if (a === '--keys-url') opt.keysUrl = argv[++i]
    else if (a === '--pin') opt.pins.push(String(argv[++i]).toLowerCase())
    else if (a === '--offline') opt.offline = true
    else if (a === '--json') opt.json = true
    else if (a === '--vectors') opt.vectors = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : ''
    else if (!a.startsWith('--')) opt.target = a
  }
  if (opt.vectors != null) return runVectors(opt.vectors)
  if (!opt.target) {
    console.log('usage: node verify-report.mjs <folder-or-pdf> [--keys keys.json] [--keys-url URL] [--pin sha256] [--offline] [--json]\n       node verify-report.mjs --vectors [file-or-url]')
    return 2
  }
  const pdfs = statSync(opt.target).isDirectory() ? readdirSync(opt.target).filter((f) => f.endsWith('.pdf')).sort().map((f) => join(opt.target, f)) : [opt.target]
  if (pdfs.length === 0) {
    console.log('no PDF found')
    return 2
  }
  const set = await loadKeySet({ keysPath: opt.keys, keysUrl: opt.keysUrl, offline: opt.offline })
  const results = []
  for (const pdf of pdfs) {
    const stem = pdf.replace(/\.pdf$/, '')
    const read = (f, json) => (existsSync(f) ? (json ? JSON.parse(readFileSync(f, 'utf8')) : readFileSync(f)) : null)
    const files = { pdf: read(pdf, false), readings: read(`${stem}.readings.json`, false), manifest: read(`${stem}.manifest.json`, true), attestation: read(`${stem}.pdf-attestation.json`, true) }
    results.push({ file: basename(pdf), ...verifyReportSet(files, set, { pins: opt.pins }) })
  }
  const verdict = worst(results.map((r) => r.verdict), ['valid', 'incomplete', 'unverified', 'invalid'])
  if (opt.json) {
    console.log(JSON.stringify({ verdict, keySet: set.error ? { error: set.error } : { source: set.source, kids: [...set.keys.keys()] }, reports: results }, null, 1))
    return EXIT[verdict]
  }
  if (set.error) console.log(`KEYS  ${KEY_UNAVAILABLE}: ${set.error}`)
  for (const r of results) {
    console.log(`\n${r.file}`)
    if (r.missing.length) console.log(`  INCOMPLETE  missing: ${r.missing.join(', ')} (download them from the order page)`)
    for (const c of r.checks) console.log(`  ${c.status === 'pass' ? 'PASS' : c.status.startsWith('fail') || c.status.startsWith('not_applicable') ? 'FAIL' : 'UNVERIFIED'}  ${c.name}${c.status === 'pass' ? '' : `: ${c.status}${c.detail ? `, ${c.detail}` : ''}`}`)
    for (const [k, s] of Object.entries(r.statuses)) console.log(`  ${k.padEnd(24)} ${s}`)
    console.log(`  verdict                  ${r.verdict}`)
    console.log(`  trust scope              ${r.trustScope}`)
  }
  console.log(`\n${verdict}: ${VERDICT_SAYS[verdict]} No check here says the readings are true or the analysis right (data_accuracy: not_independently_verified).`)
  return EXIT[verdict]
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(await main(process.argv.slice(2)))
