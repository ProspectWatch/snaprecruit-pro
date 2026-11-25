// Canadian provinces in the PW Data Enrichment state filter (CEO 2026-11-25:
// "But I don't see provinces yet"). The server (pw-hs-dashboard /api/hs-search)
// filters state by the two-letter code, so the codes match what is stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the state filter has a Canada group with all 13 provinces and territories', () => {
  for (const c of ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']) assert.match(html, new RegExp(`\\['${c}','`), c);
  assert.match(html, /\[\['United States',STATES\],\['Canada',PROVINCES\]\]/);
  assert.match(html, /grp\.label=g\[0\]/);
});

test('the empty state no longer says 130,000, and the home card has no em dash', () => {
  assert.doesNotMatch(html, /130,000/);
  assert.match(html, /Search 600,000\+ HS athletes/);
  assert.match(home, /National PW HS database: handles &amp; photos/);
});
