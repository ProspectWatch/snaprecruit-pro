// Member tag and "Non-members only" filter in the PW Data Enrichment tool
// (CEO 2026-11-16). pw-hs-dashboard decides membership (lib/memberStatus.js);
// this page only shows the tag, filters, and never drafts the Founding offer
// for a current member or an unchecked row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../js/pw-claim-profile.mjs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
const fn = (name) => {
  const m = new RegExp(`function ${name}\\(a\\)\\{[\\s\\S]*?\\n  \\}`).exec(html) || new RegExp(`function ${name}\\(a\\)\\{[^\\n]*\\}`).exec(html);
  assert.ok(m, name);
  return m[0];
};
// eslint-disable-next-line no-new-func
const lib = new Function('holdText', 'renderClaimProfile', `var dmStyle='standard';function shortDay(){return ''}\n${fn('seqOf')}\n${fn('modeOf')}\n${fn('memberHeld')}\n${fn('memberText')}\n${fn('dmFor')}\nreturn { memberHeld, memberText, dmFor };`)(
  (r) => 'HOLD ' + (r || []).join(','), render);

test('Non-members only is ON by default and sent to the server', () => {
  assert.match(html, /memberFilter='non'/);
  assert.match(html, /'&members='\+memberFilter/);
  assert.match(html, /<button class="segBtn on" type="button" data-v="non">NON-MEMBERS ONLY<\/button>/);
});

test('the Founding offer is never drafted for a current member or an unchecked row', () => {
  const eligible = { contact_hold: false, offer_refused: false, claim_reply_checked: true, profile_unclaimed: true, id: '00000000-0000-4000-8000-000000000001', sport: 'volleyball', name: 'Avery Sample', grad_year: 2029, fw_dm_rank: 14 };
  const draft = lib.dmFor(eligible);
  assert.equal(draft.ok, true);
  assert.match(draft.text, /Class of 2029 volleyball profile, and I'd love to invite you to claim it/);
  assert.match(draft.text, /profile for FREE to review/);
  assert.match(draft.text, /Optional Athlete Center membership includes advanced recruiting tools, such as research on D1 volleyball programs\./);
  assert.doesNotMatch(draft.text, /compare their performance with college players/);
  assert.ok([...draft.text].length <= 700);
  assert.match(draft.text, /claim\?id=00000000-0000-4000-8000-000000000001/);
  assert.doesNotMatch(draft.text, /Founding|ranked/);
  for (const hold of [{profile_unclaimed:false}, {claim_reply_checked:false}, {dm2:{replied:'2026-11-16'}}]) {
    assert.equal(lib.dmFor({...eligible,...hold}).ok, false);
  }
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

// The MainStage athlete list in this app (athletes.html) has the same filter:
// MainStage's /api/admin/athletes takes members=non and tags each row.
const athletes = readFileSync(new URL('../athletes.html', import.meta.url), 'utf8');
test('athletes.html: Non-members only is ON by default, sent to MainStage, and rows show the tag', () => {
  assert.match(athletes, /memberFilter='non'/);
  assert.match(athletes, /'&members='\+memberFilter/);
  assert.match(athletes, /<button class="segBtn on" type="button" data-v="non">NON-MEMBERS ONLY<\/button>/);
  assert.match(athletes, /a\.pw_member_tag&&a\.pw_member_status!=='none'/);
});

test('CLAIMED and MEMBER tags come from the server and sit with the status pill (CEO 2026-11-24)', () => {
  const m = /function cardTags\(a\)\{[\s\S]*?\n  \}/.exec(html);
  assert.ok(m, 'cardTags');
  // eslint-disable-next-line no-new-func
  const cardTags = new Function('esc', `${m[0]}\nreturn cardTags;`)((x) => String(x));
  assert.equal(cardTags({ claimed: true }), '<span class="apill claimed">CLAIMED</span>');
  assert.equal(cardTags({ member_status: 'member' }), '<span class="apill">MEMBER</span>');
  assert.equal(cardTags({ member_status: 'member', member_founding: true, claimed: true }), '<span class="apill claimed">CLAIMED</span><span class="apill">FOUNDING MEMBER</span>');
  assert.equal(cardTags({ member_status: 'former', claimed: false }), '', 'a former member is not tagged MEMBER');
  assert.equal(cardTags({ claimed: 'yes' }), '', 'only a real true counts');
  assert.match(html, /\(tags\?'<span class="apills">'\+tags\+pill\+'<\/span>':pill\)/);
});

test('Claimed and Members filters are sent to the server', () => {
  assert.match(html, /<button class="segBtn" type="button" data-v="only">MEMBERS<\/button>/);
  assert.match(html, /id="claimedFilterRow"[\s\S]*?data-v="yes">CLAIMED<[\s\S]*?data-v="no">NOT CLAIMED</);
  assert.match(html, /'&claimed='\+claimedFilter/);
  assert.match(html, /claimedFilter=b\.getAttribute\('data-v'\);/);
});

test('the card photo never falls back to the Instagram screenshot slot (CEO 2026-11-24)', () => {
  const m = /function primaryPhoto\(a\)\{[\s\S]*?\n  \}/.exec(html);
  assert.ok(m);
  // eslint-disable-next-line no-new-func
  const primaryPhoto = new Function(`${m[0]}\nreturn primaryPhoto;`)();
  assert.equal(primaryPhoto({ photos: { screenshot: 's.jpg' } }), null, 'initials, not the screenshot');
  assert.equal(primaryPhoto({ photos: { cover: 'c.jpg', screenshot: 's.jpg' } }), 'c.jpg');
  assert.equal(primaryPhoto({ photos: { action: 'a.jpg', screenshot: 's.jpg' } }), 'a.jpg');
});

test('Claimed or Members alone is enough to browse (no name typed)', () => {
  assert.match(html, /&&!claimedFilter&&memberFilter!=='only'\)\{setState\('idle'\);return\}/);
});
