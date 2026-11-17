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

test('parity fixture: the two-step DM is byte-identical across the three apps', async () => {
  const m = await import('../js/pw-founding-dm.mjs');
  assert.equal(FIX.twoStep.version, m.TWO_STEP_DM_VERSION);
  for (const c of FIX.twoStep.message1) {
    const r = m.renderTwoStepMessage1Detailed(c.input);
    assert.equal(r.text, c.text, c.label);
    assert.equal(r.chars, c.chars, c.label);
    assert.deepEqual(r.used, c.used, c.label);
  }
  for (const c of FIX.twoStep.message2) assert.equal(m.renderTwoStepMessage2({ shortLink: c.shortLink }), c.text);
  assert.equal(m.twoStepShortLink('0f8fad5b-d9cb-469f-a165-70867728950e'), FIX.twoStep.message2[0].shortLink);
});
