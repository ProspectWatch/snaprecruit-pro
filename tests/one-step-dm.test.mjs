// One-step DM in the enrichment tool (CEO 2026-11-17: "Combine the 2. Keep it
// simple"): one Copy DM, the existing Offer sent mark, no two-step controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderOneStepDm, oneStepShortLink } from '../js/pw-founding-dm.mjs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');

test('one Copy DM and the Offer sent mark; the two-step controls are gone', () => {
  assert.match(html, /id="dmCopy"/);
  assert.match(html, /id="offerRow"/);
  for (const gone of ['dm2One', 'dm2Two', 'dm2CopyOne', 'dm2CopyTwo', 'dm2Stages', 'data-stage=']) assert.doesNotMatch(html, new RegExp(gone));
});

test('volleyball gets the one-step DM with its short link; other sports keep their claim DM', () => {
  assert.match(html, /if\(!isVolleyball\(a&&a\.sport\)\)return buildFoundingDm\(a,sportLabel\);return renderOneStepDm\(/);
  const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const t = renderOneStepDm({ firstName: 'Ava', grad: 2029, shortLink: oneStepShortLink(id) });
  assert.ok(t.includes('https://verified.prospect-watch.com/c/0f8fad5bd9?s=1'));
  assert.doesNotMatch(t, /\$|USD/);
});
