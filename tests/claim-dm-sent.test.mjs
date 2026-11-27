// DM sent (CEO 2026-11-18): the sent button under COPY DM in the PW Data
// Enrichment tool, restored after 29c9f12 (#21) removed it. It records the
// free-profile claim DM through pw-hs-dashboard /api/hs-athlete-offer-sent
// (kind claim_dm, the current claim-DM version) so MainStage, the Claim Desk
// and Stephanie's Office see the same record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../js/pw-claim-profile.mjs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');

test('the sent row sits under COPY DM, before CLOSE', () => {
  const copy = html.indexOf('id="dmCopy"');
  const row = html.indexOf('id="offerRow"');
  const close = html.indexOf('id="dClose"');
  assert.ok(copy > 0 && row > copy && close > row);
});

test('MARK DM SENT, then "✓ DM sent · <date>" with Undo; a current member gets the member note, no button', () => {
  assert.match(html, /\(saving\|\|'MARK DM SENT'\)/);
  assert.match(html, /saving=dmBusy\?'SAVING\\u2026':null/);
  assert.match(html, /function dmSentLabel\(iso\)\{var d=shortDay\(iso\);return '\\u2713 DM sent'\+\(d\?' \\u00b7 '\+d:''\)\}/);
  assert.match(html, /id="dmUndo"/);
  assert.match(html, /memberHeld\(a\)\?'<p class="offerErr">'\+esc\(memberText\(a\)\)/);
  assert.match(html, /window\.confirm\('Mark this DM as not sent\?'\)/);
});

test('records through the existing route with kind claim_dm and the current claim-DM version', () => {
  assert.match(html, /import \{render as renderClaimProfile, VERSION as CLAIM_DM_VERSION\} from '\/js\/pw-claim-profile\.mjs';/);
  assert.match(html, /postJSON\(API_OFFER,\{id:a\.id,kind:'claim_dm',sent:sent,version:CLAIM_DM_VERSION,style:dmStyle,via:'enrichment'\}\)/);
  assert.match(html, /API_OFFER='\/api\/hs-athlete-offer-sent'/);
  assert.match(VERSION, /^pw-free-profile-claim\/\d{4}-\d{2}-\d{2}\./);
});

test('the sent state comes back on reload (claim_dm from the search) and shows on the list', () => {
  assert.match(html, /var rec=a\.claim_dm&&a\.claim_dm\.at\?a\.claim_dm:null;/);
  // The member tag moved to cardTags (CEO 2026-11-24), so the DM-sent pill can lead the status pill.
  assert.match(html, /[:=]a\.claim_dm&&a\.claim_dm\.at\?'<span class="apill done mut">'\+esc\(dmSentLabel\(a\.claim_dm\.at\)\)\+'<\/span>'/);
});

test('the list filter reads SENT / NOT SENT', () => {
  assert.match(html, /data-v="unsent">NOT SENT</);
  assert.match(html, /data-v="sent">SENT</);
  assert.doesNotMatch(html, /OFFER NOT SENT|>OFFER SENT</);
});

test('no em dash added', () => {
  const block = html.slice(html.indexOf('// DM sent (CEO 2026-11-18)'), html.indexOf("$('retryBtn')"));
  assert.doesNotMatch(block, /—/);
});

test('OPEN DM opens the Instagram DM thread (ig.me/m/<handle>), like the Office (CEO 2026-11-27)', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
  assert.match(html, /id="dmOpenIg" type="button">OPEN DM</);
  assert.match(html, /if\(ig\)openLink\('https:\/\/ig\.me\/m\/'\+encodeURIComponent\(ig\)\)/);
});
