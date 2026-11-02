// PW Data Enrichment claim DM (CEO 2026-11-02): signed by Stephanie with her
// contact address; volleyball carries the personal /invite link (with the HS
// id so the claim opens this profile); other sports keep the claim link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaimDm, inviteLink, dmLink, cleanPart } from '../js/pw-founding-dm.mjs';

const vb = { id: 'a644edf6-e95b-42d9-b77c-4b5993f244d2', name: 'Abby Bunyan', grad_year: 2029, sport: 'volleyball' };
const label = (s) => ({ volleyball: 'Volleyball', lacrosse: 'Lacrosse' })[s] || s;

test('volleyball DM: Stephanie, her email, the personal invite link; cancellation stays at info@', () => {
  const dm = buildClaimDm(vb, label);
  assert.match(dm, /^Hey Abby, it’s Stephanie from Prospect Watch 👋/);
  assert.match(dm, /\(Volleyball · Class of 2029\)/);
  assert.match(dm, /email me at stephanie@prospect-watch\.com/);
  assert.match(dm, /cancel any time before it renews by emailing info@prospect-watch\.com/);
  assert.match(dm, /\n\nStephanie\nProspect Watch$/);
  assert.ok(!/Stuart/.test(dm));
  assert.ok(!/—/.test(dm), 'no em dash');
  const link = dm.match(/Start here: (\S+)/)[1];
  const u = new URL(link);
  assert.equal(u.origin + u.pathname, 'https://verified.prospect-watch.com/invite');
  assert.equal(u.searchParams.get('firstName'), 'Abby');
  assert.equal(u.searchParams.get('lastName'), 'Bunyan');
  assert.equal(u.searchParams.get('gradYear'), '2029');
  assert.equal(u.searchParams.get('id'), vb.id);
  assert.equal(u.searchParams.get('utm_medium'), 'dm');
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
  assert.match(buildClaimDm(lax, label), /Stephanie\nProspect Watch$/);
});

test('no name: a neutral greeting and a link without a name', () => {
  const dm = buildClaimDm({ id: vb.id, name: '', sport: 'volleyball' }, label);
  assert.match(dm, /^Hey there,/);
  assert.equal(new URL(dm.match(/Start here: (\S+)/)[1]).searchParams.get('firstName'), null);
});
