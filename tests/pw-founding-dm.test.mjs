// PW Data Enrichment claim DM (CEO 2026-11-02): signed by Stephanie with her
// contact address; volleyball carries the personal /invite link (with the HS
// id so the claim opens this profile); other sports keep the claim link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaimDm, inviteLink, dmLink, cleanPart, DM_MAX_CHARS, rankedDmRank, stateNameOf, FOUNDING_DM_GENERAL_TEMPLATE, FOUNDING_DM_FW_RANKED_TEMPLATE } from '../js/pw-founding-dm.mjs';

const vb = { id: 'a644edf6-e95b-42d9-b77c-4b5993f244d2', name: 'Abby Bunyan', grad_year: 2029, sport: 'volleyball', state: 'TX' };
const linkOf = (dm) => dm.match(/\n\n(https:\S+)\n\n/)[1];
const label = (s) => ({ volleyball: 'Volleyball', lacrosse: 'Lacrosse' })[s] || s;

test('volleyball DM: the GENERAL Founding DM from Stephanie with the personal invite link', () => {
  const dm = buildClaimDm(vb, label);
  assert.equal(dm, FOUNDING_DM_GENERAL_TEMPLATE.replace('{firstName}', 'Abby').replace('{personalLink}', inviteLink(vb)));
  assert.match(dm, /^Hey Abby, it's Stephanie from Prospect Watch 👋/);
  assert.match(dm, /you've been selected for our Founding Athlete offer/);
  assert.match(dm, /email stephanie@prospect-watch\.com/);
  assert.match(dm, /\n\nStephanie, Prospect Watch$/);
  assert.ok(!/Stuart|\$\d|\u2014/.test(dm), 'no Stuart, no price, no em dash');
  const link = linkOf(dm);
  const u = new URL(link);
  assert.equal(u.origin + u.pathname, 'https://verified.prospect-watch.com/invite');
  assert.equal(u.searchParams.get('firstName'), 'Abby');
  assert.equal(u.searchParams.get('lastName'), 'Bunyan');
  assert.equal(u.searchParams.get('gradYear'), '2029');
  assert.equal(u.searchParams.get('id'), vb.id);
  assert.equal(u.searchParams.get('utm_medium'), 'dm');
});

test('every DM fits Instagram, even with a long name: at most 800 characters, 520 without the link', () => {
  const long = { id: vb.id, name: 'Mariaguadalupe Fernandez-Castellanos', grad_year: 2030, state: 'NC' };
  for (const a of [{ ...long, sport: 'volleyball' }, { ...long, sport: 'volleyball', fw_dm_rank: 100 }, { ...long, sport: 'lacrosse' }]) {
    const dm = buildClaimDm(a, label);
    const n = [...dm].length;
    assert.ok(n <= DM_MAX_CHARS && n <= 800, `${a.sport} ${a.fw_dm_rank || ''}: ${n} characters`);
    const withoutLink = [...dm.replace(dmLink(a), '')].length;
    assert.ok(withoutLink <= 520, `${a.sport} ${a.fw_dm_rank || ''}: ${withoutLink} characters without the link`);
    assert.ok(!/\$\d|\u2014/.test(dm), 'no price, no em dash');
  }
});

test('volleyball on Future Watch ranked 1 to 100 gets the RANKED DM with rank, state and class', () => {
  const dm = buildClaimDm({ ...vb, fw_dm_rank: 12 }, label);
  assert.equal(dm, FOUNDING_DM_FW_RANKED_TEMPLATE.replace('{firstName}', 'Abby').replace('{rank}', '12')
    .replace('{stateName}', 'Texas').replace('{grad}', '2029').replace('{personalLink}', inviteLink(vb)));
  assert.match(dm, /Congrats! You're #12 in the Texas Class of 2029 on our Future Watch list 🎉/);
  assert.match(dm, /Your ranking doesn't depend on this offer\./);
  assert.equal(rankedDmRank({ ...vb, fw_dm_rank: 12 }), 12);
});

test('everyone else gets the GENERAL DM: no rank, rank past 100, other sports, or no state or class', () => {
  const general = buildClaimDm(vb, label);
  for (const extra of [{ fw_dm_rank: null }, { fw_dm_rank: 101 }, { fw_dm_rank: 0 }, { fw_dm_rank: 5, state: '' }, { fw_dm_rank: 5, state: 'ZZ' }]) {
    assert.equal(buildClaimDm({ ...vb, ...extra }, label), general, JSON.stringify(extra));
    assert.equal(rankedDmRank({ ...vb, ...extra }), null);
  }
  assert.equal(rankedDmRank({ ...vb, fw_dm_rank: 5, grad_year: null }), null);
  assert.equal(rankedDmRank({ ...vb, sport: 'lacrosse', fw_dm_rank: 5 }), null);
  assert.doesNotMatch(buildClaimDm({ ...vb, sport: 'lacrosse', fw_dm_rank: 5 }, label), /Future Watch list/);
  assert.equal(stateNameOf('dc'), 'District of Columbia');
});

test('each athlete gets their own link and greeting', () => {
  const other = { ...vb, id: '11111111-2222-3333-4444-555555555555', name: 'abby SMITH', grad_year: 2028 };
  assert.notEqual(inviteLink(vb), inviteLink(other));
  assert.match(buildClaimDm(other, label), /^Hey Abby,/);
  assert.equal(new URL(inviteLink(other)).searchParams.get('lastName'), 'Smith', 'all-caps word tidied');
  assert.equal(cleanPart('McKenna'), 'McKenna', 'mixed case kept as typed');
  assert.equal(cleanPart('LILLYANA'), 'Lillyana');
});

test('other sports keep the direct claim link', () => {
  const lax = { ...vb, sport: 'lacrosse' };
  assert.match(dmLink(lax), /^https:\/\/verified\.prospect-watch\.com\/claim\?id=a644edf6-e95b-42d9-b77c-4b5993f244d2&name=Abby\+Bunyan&grad=2029&fresh=1$/);
  const dm = buildClaimDm(lax, label);
  assert.match(dm, /\(Lacrosse · Class of 2029\)/);
  assert.match(dm, /Claim it here: https:\/\/verified\.prospect-watch\.com\/claim\?/);
  assert.doesNotMatch(dm, /Founding Athlete/, 'no Athlete Center offer outside volleyball');
  assert.match(dm, /Stephanie\nProspect Watch$/);
});

test('no name: a neutral greeting and a link without a name', () => {
  const dm = buildClaimDm({ id: vb.id, name: '', sport: 'volleyball' }, label);
  assert.match(dm, /^Hey there,/);
  assert.equal(new URL(linkOf(dm)).searchParams.get('firstName'), null);
});
