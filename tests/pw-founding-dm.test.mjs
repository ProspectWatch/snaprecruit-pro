// PW Data Enrichment claim DM: signed by Stephanie with her contact address.
// v1.7 (CEO 2026-11-12): volleyball DMs carry the personal /invite link with
// the name reveal; other sports keep the short link /c/<code>. No DM carries
// the STOP line or sender footer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DM_FEATURES, holdText, buildClaimDm, buildClaimDmDetailed, inviteLink, claimLink, dmLink, shortLink, shortCode, cleanPart, DM_MAX_CHARS, rankedDmRank, stateNameOf, FOUNDING_DM_GENERAL_TEMPLATE, FOUNDING_DM_FW_RANKED_TEMPLATE, DM_STOP_LINE, DM_SENDER_FOOTER, FOUNDING_DM_TEMPLATE_VERSION } from '../js/pw-founding-dm.mjs';

const CLOSE = 'Questions? Reply here or email stephanie@prospect-watch.com';

const vb = { id: 'a644edf6-e95b-42d9-b77c-4b5993f244d2', name: 'Abby Bunyan', grad_year: 2029, sport: 'volleyball', state: 'TX', contact_hold: false };
const SHORT = 'https://verified.prospect-watch.com/c/a644edf6e9';
const INVITE = 'https://verified.prospect-watch.com/invite?firstName=Abby&lastName=Bunyan&gradYear=2029&sport=volleyball&id=a644edf6-e95b-42d9-b77c-4b5993f244d2&utm_source=instagram&utm_medium=dm&utm_campaign=ac_launch_2026_11_enrichment';
const label = (s) => ({ volleyball: 'Volleyball', lacrosse: 'Lacrosse' })[s] || s;

test('v1.7 volleyball DM: the GENERAL Founding DM word for word, with the name-reveal link and no STOP footer', () => {
  const dm = buildClaimDm(vb, label);
  assert.equal(FOUNDING_DM_TEMPLATE_VERSION, 'pw-founding-dm/2026-11-12.v1.7');
  assert.equal(dm, [
    "Hey Abby 👋 It's Stephanie from Prospect Watch.",
    '',
    "You're invited to join as a Founding Athlete, with early access to our Athlete Center:",
    '',
    "🏐 Compare your high school season with D1 players' high school seasons at your position and grade",
    '👥 See the players listed at your position at each school, with public commitments shown separately',
    '🔎 Research every D1 volleyball program, check which offer your majors and build your list',
    '🎓 See admissions details where schools publish them: deadlines, GPA and SAT and ACT ranges',
    '🗺️ Get a Recruiting Roadmap with your next step',
    '✅ Get reviewed for PW Verified: if approved, the badge and a registry listing',
    '',
    'Claim your free profile here:',
    INVITE,
    '',
    'Questions? Reply here or email stephanie@prospect-watch.com',
  ].join('\n'));
  assert.equal(DM_STOP_LINE, 'Reply STOP to stop our marketing messages on Instagram and email. Account and security messages may continue.');
  assert.equal(DM_SENDER_FOOTER, 'Stephanie, on behalf of Prospect Watch, 2248 Broadway #1314, New York, NY 10024\nverified.prospect-watch.com/trust');
  assert.doesNotMatch(dm, /Reply STOP|on behalf of Prospect Watch/);
  assert.equal(buildClaimDmDetailed(vb, label).version, FOUNDING_DM_TEMPLATE_VERSION);
  assert.ok(!/Stuart|\$\d|\u2014/.test(dm), 'no Stuart, no price, no em dash');
});

test('links: volleyball gets the name-reveal /invite link; other sports keep the short link', () => {
  assert.equal(shortCode(vb.id), 'a644edf6e9');
  assert.equal(shortLink(vb.id), SHORT);
  assert.equal(dmLink(vb), INVITE);
  assert.equal(dmLink({ ...vb, sport: 'lacrosse' }), SHORT, 'other sports: the short link');
  assert.equal(shortLink('Abby Bunyan'), '');
  assert.match(dmLink({ ...vb, sport: 'lacrosse', id: 'not-an-id' }), /^https:\/\/verified\.prospect-watch\.com\/claim\?/, 'an unusable id falls back to the claim link');
});

test('every DM fits Instagram (1,000 characters) in the longest case; feature lines drop, never the link', () => {
  const long = { id: vb.id, name: 'Maximiliana-Josephine Fernandez-Castellanos', grad_year: 2030, state: 'DC', contact_hold: false };
  for (const a of [{ ...long, sport: 'volleyball' }, { ...long, sport: 'volleyball', fw_dm_rank: 100 }, { ...long, sport: 'lacrosse' }]) {
    const r = buildClaimDmDetailed(a, label);
    assert.ok(r.text, `${a.sport}: a DM renders`);
    assert.ok(r.chars <= DM_MAX_CHARS, `${a.sport} ${a.fw_dm_rank || ''}: ${r.chars} characters`);
    assert.ok(r.text.endsWith(CLOSE), 'ends with the questions line');
    assert.ok(r.text.includes(dmLink(a)), 'full link');
    assert.ok(!/\$\d|\u2014/.test(r.text), 'no price, no em dash');
  }
  const ranked = buildClaimDmDetailed({ ...long, sport: 'volleyball', fw_dm_rank: 100 }, label);
  assert.equal(ranked.variant, 'RANKED');
  assert.equal(ranked.version, 'pw-founding-dm/2026-11-12.v1.7');
  assert.ok(ranked.features.includes('comparison') && ranked.features.includes('schoolIntel'));
  assert.equal(DM_FEATURES.length, 6);
});

test('RANKED v1.7: the wording, filled, with the name-reveal link', () => {
  const r = buildClaimDmDetailed({ ...vb, fw_dm_rank: 12 }, label);
  assert.equal(r.variant, 'RANKED');
  // With the full link, a typical RANKED DM drops the lowest-priority line (admissions) to fit.
  assert.deepEqual(r.features, ['comparison', 'schoolIntel', 'findSchools', 'roadmap', 'verified']);
  assert.equal(r.text, FOUNDING_DM_FW_RANKED_TEMPLATE.replace('{firstName}', 'Abby').replace('{rank}', '12')
    .replace('{stateName}', 'Texas').replace('{grad}', '2029').replace('{personalLink}', INVITE)
    .replace(/\n🎓 [^\n]*/u, ''));
  assert.match(r.text, /^Hey Abby 👋 It's Stephanie from Prospect Watch\.\n\nCongrats! You're ranked #12 in Texas's Class of 2029 on our Future Watch list\. Your ranking doesn't depend on whether you sign up\.\n\nYou're invited to join as a Founding Athlete/);
  assert.equal(FOUNDING_DM_GENERAL_TEMPLATE, FOUNDING_DM_FW_RANKED_TEMPLATE.replace(/\n\nCongrats![^\n]*/, ''), 'GENERAL is RANKED without the ranking paragraph');
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
  assert.notEqual(dmLink(vb), dmLink(other));
  assert.match(buildClaimDm(other, label), /^Hey Abby 👋/);
  assert.equal(new URL(inviteLink(other)).searchParams.get('lastName'), 'Smith', 'all-caps word tidied');
  assert.equal(cleanPart('McKenna'), 'McKenna', 'mixed case kept as typed');
  assert.equal(cleanPart('LILLYANA'), 'Lillyana');
});

test('other sports: the claim-only DM with the short link and no STOP footer', () => {
  const lax = { ...vb, sport: 'lacrosse' };
  assert.match(claimLink(lax), /^https:\/\/verified\.prospect-watch\.com\/claim\?id=a644edf6-e95b-42d9-b77c-4b5993f244d2&name=Abby\+Bunyan&grad=2029&fresh=1$/, 'the full claim link is kept as the fallback');
  const dm = buildClaimDm(lax, label);
  assert.match(dm, /\(Lacrosse · Class of 2029\)/);
  assert.match(dm, new RegExp(`Claim it here: ${SHORT}\n`));
  assert.doesNotMatch(dm, /Founding Athlete/, 'no Athlete Center offer outside volleyball');
  assert.ok(dm.endsWith(CLOSE), 'ends with the questions line');
  assert.doesNotMatch(dm, /Reply STOP|on behalf of Prospect Watch/);
});

test('no name: a neutral greeting', () => {
  const dm = buildClaimDm({ id: vb.id, name: '', sport: 'volleyball', contact_hold: false }, label);
  assert.match(dm, /^Hey there 👋/);
  assert.match(dm, /\/invite\?utm_source=instagram/, 'no name: the /invite link without a name reveal');
});

// Any STOP stops every channel (final sign-off Schedule 5): a held athlete gets no DM.
test('contact hold: no DM for do not contact, an email opt-out, a STOP, or an unknown check; fails closed', () => {
  for (const reasons of [['do_not_contact'], ['email_opt_out'], ['stop_on_ledger'], ['unknown']]) {
    const r = buildClaimDmDetailed({ ...vb, contact_hold: true, contact_hold_reasons: reasons }, label);
    assert.equal(r.text, null, reasons[0]);
    assert.equal(r.variant, 'CONTACT_HOLD');
    assert.equal(buildClaimDm({ ...vb, contact_hold: true, contact_hold_reasons: reasons }, label), '');
  }
  for (const missing of [undefined, null, 'false', 0]) {
    assert.equal(buildClaimDmDetailed({ ...vb, contact_hold: missing }, label).variant, 'CONTACT_HOLD', `contact_hold ${missing} is held`);
  }
  assert.equal(holdText(['email_opt_out']), 'Do not message this athlete: the family opted out of Prospect Watch messages.');
  assert.match(holdText(), /could not be completed/);
});

test('the enrichment page rechecks the hold right before copying, and fails closed', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../pw-enrichment.html', import.meta.url), 'utf8');
  assert.match(page, /var API_HOLD='\/api\/hs-contact-hold'/);
  assert.match(page, /fetch\(API_HOLD\+'\?id='/, 'copy asks the server first');
  assert.match(page, /if\(!h\|\|h\.contact_hold!==false\)/, 'anything but an explicit clear is held');
  const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert.match(toml, /from = "\/api\/hs-contact-hold"\n  to = "https:\/\/pw-hs-dashboard\.vercel\.app\/api\/hs-contact-hold"/);
});
