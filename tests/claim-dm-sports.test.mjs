// The claim DM for every sport we cover (CEO pop-up 2026-11-27 "Approve as rendered"): the approved text with the
// sport word swapped; the membership sentence only for girls volleyball, where it is true; unknown sports refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { render, SPORT_WORD } from '../js/pw-claim-profile.mjs';
const base = { athleteFirst: 'Avery', gradYear: 2029, athleteId: '00000000-0000-4000-8000-000000000001', eligibilityChecked: true, suppressionChecked: true, profileUnclaimed: true };
const MEMBER = /Optional Athlete Center membership includes advanced recruiting tools, such as research on D1 volleyball programs\./;

test('girls volleyball: the approved DM, unchanged', () => {
  for (const sport of [undefined, 'volleyball', 'Volleyball']) {
    const r = render({ ...base, sport }, { channel: 'dm' });
    assert.equal(r.ok, true); assert.match(r.body, /Class of 2029 volleyball profile/); assert.match(r.body, MEMBER);
  }
});
test('every other sport: its own sport word, no membership sentence', () => {
  for (const [key, word] of Object.entries(SPORT_WORD)) {
    if (key === 'volleyball') continue;
    for (const audience of ['athlete', 'guardian']) {
      const r = render({ ...base, sport: key }, { channel: 'dm', audience });
      assert.equal(r.ok, true, key); assert.match(r.body, new RegExp(`Class of 2029 ${word} profile`)); assert.doesNotMatch(r.body, MEMBER, key);
      assert.doesNotMatch(r.body, /—/);
    }
  }
  assert.doesNotMatch(render({ ...base, sport: 'volleyball', gender: 'M' }, { channel: 'dm' }).body, MEMBER, 'boys volleyball');
});
test('an unknown sport is refused, never guessed; the sheet no longer blocks other sports, the sales DM stays volleyball', async () => {
  assert.equal(render({ ...base, sport: 'curling' }, { channel: 'dm' }).ok, false);
  const html = (await import('node:fs')).readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /The approved claim invitation is for volleyball profiles\./);
  assert.match(html, /sport:a\.sport,gender:a\.gender,/);
  assert.match(html, /The sales DM is for volleyball\./);
});
