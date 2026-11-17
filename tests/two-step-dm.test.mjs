// Two-step DM in the enrichment tool (CEO GO 2026-11-17): Copy message 1 and
// Copy message 2 with the copy-time recheck, and the three stage marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderTwoStepMessage1, twoStepShortLink } from '../js/pw-founding-dm.mjs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');

test('the sheet shows prior stages and staff-operated copy controls', () => {
  assert.match(html, /id="dmHistory"/);
  assert.match(html, /id="dmSequenceCopy"/);
  assert.match(html, /if\(variant&&!h\.claim_stages\)/);
  assert.match(html, /Message 1 sent.*Athlete replied.*Message 2 sent/);
});

test('the one-message copy rechecks contact, membership, claim and prior activity', () => {
  assert.match(html, /a\.contact_hold!==false/);
  assert.match(html, /a\.offer_refused!==false/);
  assert.match(html, /a\.profile_unclaimed!==true/);
  assert.match(html, /a\.claim_reply_checked!==true/);
  assert.match(html, /h\.prior_claim_dm===false/);
});

test('message 1 has no link; message 2 uses the two-step short link', () => {
  const m1 = renderTwoStepMessage1({ firstName: 'Ava', grad: 2029, position: 'S', school: 'Lake Travis HS' });
  assert.doesNotMatch(m1, /https?:/);
  assert.equal(twoStepShortLink('0f8fad5b-d9cb-469f-a165-70867728950e'), 'https://verified.prospect-watch.com/c/0f8fad5bd9?s=2');
});
