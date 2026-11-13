// Founding DM parity (CEO GO 2026-11-13): the same fixture lives in
// pw-hs-dashboard (test/fixtures) and MainStage-media (scripts); the enrichment
// tool's renderer must reproduce every case byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildClaimDm, buildClaimDmDetailed, dmLink, FOUNDING_DM_TEMPLATE_VERSION } from '../js/pw-founding-dm.mjs';

const FIX = JSON.parse(fs.readFileSync(new URL('./founding-dm-parity.json', import.meta.url), 'utf8'));

test('parity fixture: the enrichment DM is byte-identical to the Claim Desk and MainStage DMs', () => {
  assert.equal(FIX.version, FOUNDING_DM_TEMPLATE_VERSION);
  for (const c of FIX.cases) {
    assert.equal(dmLink(c.athlete), c.personalLink, c.label);
    assert.equal(buildClaimDm(c.athlete, (s) => s), c.text, c.label);
    const r = buildClaimDmDetailed(c.athlete, (s) => s);
    assert.equal(r.chars, c.chars, c.label);
    assert.deepEqual(r.features, c.features, c.label);
  }
});
