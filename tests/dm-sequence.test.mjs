// DM sequence and sales handoff in the PW Data Enrichment sheet (CEO 2026-11-27: "multiple dm copy and pastes.
// Sequencing and tracking what has been sent already, and pipeline claimed profiles into the sales pipeline").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../js/pw-claim-profile.mjs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
const fn = (name) => {
  const m = new RegExp(`function ${name}\\(a\\)\\{[\\s\\S]*?\\n  \\}`).exec(html);
  assert.ok(m, name);
  return m[0];
};
const make = (style) => new Function('holdText', 'renderClaimProfile', `var dmStyle='${style}';function shortDay(iso){return iso?String(iso).slice(5,10):''}\n${fn('seqOf')}\n${fn('modeOf')}\n${fn('memberHeld')}\n${fn('memberText')}\n${fn('dmFor')}\nreturn { modeOf, dmFor };`)((r) => 'HOLD ' + (r || []).join(','), render);
const lib = make('standard');
const base = { contact_hold: false, offer_refused: false, claim_reply_checked: true, profile_unclaimed: true, id: '00000000-0000-4000-8000-000000000001', sport: 'volleyball', name: 'Avery Sample', grad_year: 2029 };

test('DM 1, to the athlete or to the parent (approved copy only)', () => {
  assert.equal(lib.modeOf(base), 'dm1');
  assert.match(lib.dmFor(base).text, /Hey Avery, it's Stephanie/);
  const parent = make('guardian').dmFor(base);
  assert.equal(parent.ok, true);
  assert.match(parent.text, /Hey Avery's family, it's Stephanie/);
});

test('after DM 1: wait for the follow-up, then the one approved follow-up, then complete', () => {
  const sent = { ...base, claim_dm: { at: '2026-11-25T15:00:00Z' }, dm_seq: { last: { step: 1, at: '2026-11-25T15:00:00Z' }, due: false, dueOn: '2026-11-28T15:00:00Z' } };
  assert.equal(lib.modeOf(sent), 'wait');
  assert.equal(lib.dmFor(sent).ok, false);
  const due = { ...sent, dm_seq: { ...sent.dm_seq, due: true } };
  assert.equal(lib.modeOf(due), 'followup');
  const fu = lib.dmFor(due);
  assert.equal(fu.ok, true);
  assert.match(fu.text, /Just following up with the link to claim your free Prospect Watch profile/);
  const done = { ...sent, dm_seq: { last: { step: 2, at: '2026-11-29T15:00:00Z' } } };
  assert.equal(lib.modeOf(done), 'done');
  assert.equal(lib.dmFor(done).ok, false);
});

test('claimed: the sheet switches to the sales DM (loaded from the server), never the claim DM; members held', () => {
  const claimed = { ...base, claimed: true, profile_unclaimed: false };
  assert.equal(lib.modeOf(claimed), 'sales');
  assert.equal(lib.dmFor(claimed).ok, false, 'not before it is loaded');
  assert.equal(lib.dmFor({ ...claimed, _sales: { message: 'Hi Avery! Sales DM' } }).ok, true);
  assert.equal(lib.dmFor({ ...claimed, _sales: { held: 'The Founding offer is closed.' } }).ok, false);
  assert.equal(lib.dmFor({ ...claimed, _sales: { message: 'x' }, sales_dm_at: '2026-11-27T20:00:00Z' }).ok, false, 'already sent');
  assert.equal(lib.dmFor({ ...claimed, offer_refused: true, member_tag: 'Member' }).ok, false);
});

test('the follow-up and the sales DM are recorded in the same places the PW Office reads', () => {
  assert.match(html, /kind:'dm_sent',sent:true,step:2,style:dmStyle/);
  assert.match(html, /kind:'sales_dm',sent:true/);
  assert.match(html, /API_SALES='\/api\/hs-sales-dm'/);
  assert.match(readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8'), /from = "\/api\/hs-sales-dm"/);
});
