# Test vectors

- `evidence-test-vectors.json`: canonical JSON, readings-bytes, signature and report-set vectors
  (same file as https://aspern.org/evidence-test-vectors.json). Run with
  `node tools/verify-report.mjs --vectors tools/test-vectors/evidence-test-vectors.json`.
- `evidence-keys.json`: a dated mirror of the real public key bundle
  (https://aspern.org/evidence-keys.json); the live endpoint is authoritative.
- `sample-report/`: an untouched report set, extracted from the vector "an untouched report".
- `sample-report-tampered/`: the same set with one byte of the PDF changed; must verify as invalid.

The sample sets are signed with a test key (`ed25519-test-vector`) whose 32-byte seed is published
in the vectors file. It never signs a real report; anyone can re-derive it, which is the point.
