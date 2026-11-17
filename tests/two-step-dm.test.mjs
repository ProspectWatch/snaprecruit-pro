// Two-step DM in the enrichment tool (CEO GO 2026-11-17): Copy message 1 and
// Copy message 2 with the copy-time recheck, and the three stage marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderTwoStepMessage1, twoStepShortLink } from '../js/pw-founding-dm.mjs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');

test('the sheet has both copy buttons and the three stage marks', () => {
  for (const id of ['dm2One', 'dm2Two', 'dm2CopyOne', 'dm2CopyTwo', 'dm2Stages']) assert.match(html, new RegExp(`id="${id}"`));
  for (const s of ['msg1', 'replied', 'msg2']) assert.match(html, new RegExp(`data-stage="${s}"`));
  assert.match(html, /postJSON\(API_OFFER,\{id:a\.id,stage:stage,sent:on\}\)/);
});

test('both copies recheck STOP and membership first; held rows get no message', () => {
  assert.match(html, /function recheckThenCopy/);
  assert.match(html, /if\(h\.member_hold!==false\)\{a\.offer_refused=true/);
  assert.match(html, /var held=dmFor\(a\);\s*if\(!held\.ok\)return \{one:held\.text,two:'',ok:false\}/);
});

test('message 1 has no link; message 2 uses the two-step short link', () => {
  const m1 = renderTwoStepMessage1({ firstName: 'Ava', grad: 2029, position: 'S', school: 'Lake Travis HS' });
  assert.doesNotMatch(m1, /https?:/);
  assert.equal(twoStepShortLink('0f8fad5b-d9cb-469f-a165-70867728950e'), 'https://verified.prospect-watch.com/c/0f8fad5bd9?s=2');
});
