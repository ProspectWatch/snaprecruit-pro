// Member tag and "Non-members only" filter in the PW Data Enrichment tool
// (CEO 2026-11-16). pw-hs-dashboard decides membership (lib/memberStatus.js);
// this page only shows the tag, filters, and never drafts the Founding offer
// for a current member or an unchecked row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
const fn = (name) => {
  const m = new RegExp(`function ${name}\\(a\\)\\{[\\s\\S]*?\\n  \\}`).exec(html) || new RegExp(`function ${name}\\(a\\)\\{[^\\n]*\\}`).exec(html);
  assert.ok(m, name);
  return m[0];
};
// eslint-disable-next-line no-new-func
const lib = new Function('holdText', 'buildClaimDm', `${fn('memberHeld')}\n${fn('memberText')}\n${fn('dmFor')}\nreturn { memberHeld, memberText, dmFor };`)(
  (r) => 'HOLD ' + (r || []).join(','), () => 'THE OFFER DM');

test('Non-members only is ON by default and sent to the server', () => {
  assert.match(html, /memberFilter='non'/);
  assert.match(html, /'&members='\+memberFilter/);
  assert.match(html, /<button class="segBtn on" type="button" data-v="non">NON-MEMBERS ONLY<\/button>/);
});

test('the Founding offer is never drafted for a current member or an unchecked row', () => {
  assert.equal(lib.dmFor({ contact_hold: false, offer_refused: false }).text, 'THE OFFER DM');
  const founding = lib.dmFor({ contact_hold: false, offer_refused: true, member_tag: 'Founding member' });
  assert.equal(founding.ok, false);
  assert.match(founding.text, /already a Founding member/);
  assert.match(lib.dmFor({ contact_hold: false, offer_refused: true, member_tag: 'Member' }).text, /already a current member/);
  // An older server that sends no offer_refused: held, never drafted.
  assert.equal(lib.dmFor({ contact_hold: false }).ok, false);
  // A contact STOP still wins.
  assert.match(lib.dmFor({ contact_hold: true, contact_hold_reasons: ['x'], offer_refused: false }).text, /^HOLD/);
});

test('the copy-time recheck honours a membership recorded after the search loaded', () => {
  assert.match(html, /if\(h\.member_hold!==false\)\{/);
});
