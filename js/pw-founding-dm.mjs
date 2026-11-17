// PW Data Enrichment: the profile claim DM (CEO 2026-11-02).
//
// - Signed by Stephanie, with stephanie@prospect-watch.com for questions
//   ("make the messages signed as Stephanie with contact email as
//   stephanie@prospect-watch.com"). Cancellation stays at
//   info@prospect-watch.com, the address the Membership Terms name.
// - Every DM carries the short link /c/<code> (v1.4, CEO GO 2026-11-07),
//   which pw-hs-dashboard resolves on the server: volleyball to the id-only
//   /invite (the Athlete Center landing with the Founding Athlete offer, and
//   "Claim your profile" opens this athlete's own profile), other sports to
//   the direct claim link (the Athlete Center is volleyball only). The full
//   inviteLink and claimLink below are kept as the fallback for an unusable
//   id. Mirrors pw-hs-dashboard lib/foundingInvite.js.
// Copy: shortened for Instagram (CEO 2026-11-02). The two volleyball DMs
// mirror pw-hs-dashboard lib/foundingDm.js word for word (the source of
// truth): RANKED for a Future Watch athlete with a FINAL rank of 1 to 100
// (a.fw_dm_rank from /api/hs-search), GENERAL for everyone else. No em dashes.

export const INVITE_URL = 'https://verified.prospect-watch.com/invite';
export const CLAIM_URL = 'https://verified.prospect-watch.com/claim';
export const CONTACT_EMAIL = 'stephanie@prospect-watch.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_NAME = /[^\p{L}\p{M}'’“”". -]/gu;
const NOT_LETTER = /[^\p{L}]/gu;
const WORD_START = /(^|[\s'’“".-])(\p{L})/gu;

/** One name part tidied for display (same rules as lib/foundingInvite.js). */
export function cleanPart(v) {
  if (typeof v !== 'string') return '';
  let s = v.normalize('NFC').replace(NOT_NAME, '').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 40) return '';
  const letters = s.replace(NOT_LETTER, '');
  if (letters === letters.toLowerCase() || (letters === letters.toUpperCase() && letters.length > 3)) {
    s = s.toLowerCase().replace(WORD_START, (_m, a, b) => a + b.toUpperCase());
  }
  return s;
}

export function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

export const isVolleyball = (sport) => String(sport || '').trim().toLowerCase() === 'volleyball';

/** The personal /invite link for a volleyball athlete (name, class, sport, HS id, attribution). */
export function inviteLink(a) {
  const { first, last } = splitName(a && a.name);
  const qs = new URLSearchParams();
  const f = cleanPart(first);
  if (f) {
    qs.set('firstName', f);
    const l = cleanPart(last);
    if (l) qs.set('lastName', l);
    const g = Number(a.grad_year);
    if (Number.isInteger(g) && g >= 2024 && g <= 2040) qs.set('gradYear', String(g));
    qs.set('sport', 'volleyball');
    if (typeof a.id === 'string' && UUID.test(a.id)) qs.set('id', a.id);
  }
  qs.set('utm_source', 'instagram');
  qs.set('utm_medium', 'dm');
  qs.set('utm_campaign', 'ac_launch_2026_11_enrichment');
  return `${INVITE_URL}?${qs.toString()}`;
}

/** The direct claim link (other sports): skips the search, fresh=1 marks a first claim. */
export function claimLink(a) {
  const p = new URLSearchParams();
  p.set('id', a.id);
  if (a.name) p.set('name', a.name);
  if (a.grad_year) p.set('grad', a.grad_year);
  p.set('fresh', '1');
  return `${CLAIM_URL}?${p.toString()}`;
}

// Short DM link (v1.4, CEO GO 2026-11-07): https://verified.prospect-watch.com/c/<code>,
// code = the first 10 hex characters of the HS profile id (dashes removed),
// the same as pw-hs-dashboard lib/foundingInvite.js shortCode. pw-hs-dashboard
// resolves it on the server to the id-only /invite link (volleyball) or the
// direct claim link (other sports); an unknown or ambiguous code never
// reaches another athlete. No name, class or other personal detail is in it.
export const SHORT_URL = 'https://verified.prospect-watch.com/c/';
export const SHORT_CODE_LEN = 10;
export const shortCode = (id) => (typeof id === 'string' && UUID.test(id) ? id.toLowerCase().replace(/-/g, '').slice(0, SHORT_CODE_LEN) : '');
export const shortLink = (id) => { const c = shortCode(id); return c ? SHORT_URL + c : ''; };

/**
 * The link the DM carries. v1.7 (CEO 2026-11-12: "proper personalized link
 * with name animated"): volleyball gets the personal /invite link that reveals
 * the athlete's name; other sports keep the short link (else the claim link).
 */
export const dmLink = (a) => (isVolleyball(a && a.sport) ? inviteLink(a) : (shortLink(a && a.id) || claimLink(a)));

/** Instagram caps a DM at 1,000 characters (CEO 2026-11-02: "the DM is too long for IG"). */
export const DM_MAX_CHARS = 1000;

// v1.4 (CEO GO 2026-11-07, "DM go as drafted"), word for word
// pw-hs-dashboard lib/foundingDm.js (the source of truth).
// v1.5 (CEO 2026-11-10): four feature lines checked against the product.
// v1.6 (2026-11-12, copy review): "invited" instead of "picked", and the
// roster line names what the screen shows.
// v1.7 (CEO 2026-11-12, relayed by #00): "The DM copy needs to proper
// personalized link with name animated. Remove the stop section at the
// bottom. They have our contact information. And Improve the AC descriptions
// and features." No STOP line or sender footer in any DM; feature lines drop
// (lowest priority first) to fit 1,000 characters, never the link.
// No emojis (CEO 2026-11-12: "Lose the emojis"); "• " is the bullet.
// v1.8 (CEO GO 2026-11-13, relayed by #00, his exact lines): the intro says
// the listed features come with paid membership, and the call to action names
// the free profile and the optional membership offer separately. Feature
// lines, drop order, link, STOP handling and the questions line unchanged.
// v1.9 (CEO 2026-11-16, relayed by #00): the RANKED paragraph drops "Your
// ranking doesn't depend on whether you sign up." (a deviation from the
// signed-off template, recorded like the STOP line; Terms v1.2 1.5 still
// says rankings are never for sale), and feature lines use "• " bullets.
// v1.9 final wording (CEO 2026-11-16, from the RANKED example, relayed by #00):
// "next steps", the Verified line "Get PW Verified and show coaches you are
// serious about playing NCAA volleyball" (lowercase per the copy standard),
// and the CTA "Claim your profile and view your Founding Athlete membership
// offer:" (drops "free" and "optional" from the 2026-11-15 wording, by his
// own instruction). Final by CEO "merge as written" 2026-11-16; the Verified
// line drops "if approved". Deviations recorded in STEPH-OUTREACH 4c.
export const FOUNDING_DM_TEMPLATE_VERSION = 'pw-founding-dm/2026-11-16.v1.9';
// Kept exported for older callers; no longer part of any DM since v1.7.
export const DM_STOP_LINE = 'Reply STOP to stop our marketing messages on Instagram and email. Account and security messages may continue.';
export const DM_SENDER_FOOTER = 'Stephanie, on behalf of Prospect Watch, 2248 Broadway #1314, New York, NY 10024\nverified.prospect-watch.com/trust';
const DM_QUESTIONS = 'Questions? Reply here or email stephanie@prospect-watch.com';
// Same switch as pw-hs-dashboard lib/foundingDm.js DM_INCLUDE_ROADMAP.
export const DM_INCLUDE_ROADMAP = true;
const DM_GREETING = "Hey {firstName}, it's Stephanie from Prospect Watch.";
const DM_RANK_PARAGRAPH = "Congrats! You're ranked #{rank} in {stateName}'s Class of {grad} on our Future Watch list.";
const DM_INTRO = "You're invited to join as a Founding Athlete. Paid membership includes these Athlete Center features:";
export const DM_FEATURES = Object.freeze([
  Object.freeze({ feature: 'comparison', line: "• Compare your high school season with D1 players' high school seasons at your position and grade" }),
  Object.freeze({ feature: 'schoolIntel', line: '• See the players listed at your position at each school, with public commitments shown separately' }),
  Object.freeze({ feature: 'findSchools', drop: 4, line: '• Research every D1 volleyball program, check which offer your majors and build your list' }),
  Object.freeze({ feature: 'admissions', drop: 1, line: '• See admissions details where schools publish them: deadlines, GPA and SAT and ACT ranges' }),
  ...(DM_INCLUDE_ROADMAP ? [Object.freeze({ feature: 'roadmap', drop: 3, line: '• Get a Recruiting Roadmap with your next steps' })] : []),
  Object.freeze({ feature: 'verified', drop: 2, line: '• Get PW Verified and show coaches you are serious about playing NCAA volleyball' }),
]);
const bodyWith = (lines) => `${DM_INTRO}\n\n${lines.map((f) => f.line).join('\n')}\n\nClaim your profile and view your Founding Athlete membership offer:\n{personalLink}\n\n${DM_QUESTIONS}`;
const DM_BODY = bodyWith(DM_FEATURES);
function featureSets() {
  const out = [DM_FEATURES];
  let cur = DM_FEATURES;
  for (const f of DM_FEATURES.filter((x) => x.drop).sort((x, y) => x.drop - y.drop)) { cur = cur.filter((x) => x !== f); out.push(cur); }
  return out;
}

export const FOUNDING_DM_GENERAL_TEMPLATE = `${DM_GREETING}

${DM_BODY}`;

export const FOUNDING_DM_FW_RANKED_TEMPLATE = `${DM_GREETING}

${DM_RANK_PARAGRAPH}

${DM_BODY}`;

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** Full state name for a two-letter code ("TX" gives "Texas"), else null. */
export const stateNameOf = (code) => STATE_NAMES[String(code || '').trim().toUpperCase()] || null;

/**
 * The Future Watch rank the RANKED DM uses, else null: volleyball only,
 * a.fw_dm_rank from /api/hs-search (FINAL rank 1 to 100 on Future Watch),
 * and the state and class needed to fill the sentence.
 */
export function rankedDmRank(a) {
  if (!a || !isVolleyball(a.sport)) return null;
  const r = Number(a.fw_dm_rank);
  if (a.fw_dm_rank == null || !Number.isInteger(r) || r < 1 || r > 100) return null;
  const g = Number(a.grad_year);
  if (!stateNameOf(a.state) || !Number.isInteger(g) || g < 2024 || g > 2040) return null;
  return r;
}

const count = (t) => [...t].length;

/**
 * The DM as { text, variant, version, chars }, never over DM_MAX_CHARS.
 * Volleyball: the RANKED Founding DM for a Future Watch athlete ranked 1 to
 * 100, else GENERAL, each word for word pw-hs-dashboard lib/foundingDm.js,
 * with the personal invite link. RANKED v1.3 fits the longest real invite
 * link (246 characters); if a link were ever longer still, the GENERAL text
 * is used (variant GENERAL_LENGTH_FALLBACK), exactly as
 * renderFoundingDmDetailed does. Other sports (no Athlete Center yet): a
 * claim-only version with the direct claim link, closing with the questions
 * line (no STOP line or footer since v1.7). Price and terms live on the page the link opens.
 */
// Any STOP stops every channel (U-05; final sign-off Schedule 5): an athlete
// /api/hs-search marks contact_hold (do not contact, a family email opted
// out, or a STOP on the contact ledger) gets no DM at all.
export const HOLD_REASON_TEXT = {
  do_not_contact: 'marked do not contact',
  email_opt_out: 'the family opted out of Prospect Watch messages',
  stop_on_ledger: 'a STOP is on record',
  unknown: 'the contact check could not be completed',
};
export const holdText = (reasons) => 'Do not message this athlete: ' + ((reasons && reasons.length ? reasons : ['unknown']).map((r) => HOLD_REASON_TEXT[r] || r).join('; ')) + '.';

export function buildClaimDmDetailed(a, sportLabel = (s) => s) {
  if (!a || a.contact_hold !== false) {
    // Fail closed: a row without an explicit contact_hold false is held.
    return { text: null, variant: 'CONTACT_HOLD', version: FOUNDING_DM_TEMPLATE_VERSION, chars: 0, reasons: (a && a.contact_hold_reasons) || ['unknown'] };
  }
  const first = cleanPart(splitName(a.name).first) || 'there';
  if (isVolleyball(a.sport)) {
    const link = dmLink(a);
    const v = FOUNDING_DM_TEMPLATE_VERSION;
    const fill = (t) => t.replace('{firstName}', first).replace('{personalLink}', link);
    const sets = featureSets();
    const rank = rankedDmRank(a);
    if (rank) {
      const rp = DM_RANK_PARAGRAPH.replace('{rank}', String(rank)).replace('{stateName}', stateNameOf(a.state)).replace('{grad}', String(Number(a.grad_year)));
      for (const set of sets) {
        const t = fill(`${DM_GREETING}\n\n${rp}\n\n${bodyWith(set)}`);
        if (count(t) <= DM_MAX_CHARS) return { text: t, variant: 'RANKED', version: v, chars: count(t), features: set.map((f) => f.feature) };
      }
    }
    for (const set of sets) {
      const t = fill(`${DM_GREETING}\n\n${bodyWith(set)}`);
      if (count(t) <= DM_MAX_CHARS) return { text: t, variant: rank ? 'GENERAL_LENGTH_FALLBACK' : 'GENERAL', version: v, chars: count(t), features: set.map((f) => f.feature) };
    }
    return { text: null, variant: 'TOO_LONG', version: v, chars: 0, features: [] };
  }
  const bits = [];
  const sport = a.sport ? sportLabel(a.sport) : '';
  if (sport) bits.push(sport);
  if (a.grad_year) bits.push('Class of ' + a.grad_year);
  const context = bits.length ? ' (' + bits.join(' · ') + ')' : '';
  const text = "Hey " + first + ", it's Stephanie from Prospect Watch.\n"
    + "We've built your recruiting profile" + context + '. Claiming it is free: check your info and add your own stats, highlights and photo.\n'
    + 'Claim it here: ' + dmLink(a) + '\n'
    + "This isn't a ranking or Future Watch selection.\n"
    + DM_QUESTIONS;
  return count(text) <= DM_MAX_CHARS
    ? { text, variant: 'CLAIM_ONLY', version: FOUNDING_DM_TEMPLATE_VERSION, chars: count(text) }
    : { text: null, variant: 'TOO_LONG', version: FOUNDING_DM_TEMPLATE_VERSION, chars: count(text) };
}

/** The DM text only (see buildClaimDmDetailed). Empty string when no approved text fits. */
export function buildClaimDm(a, sportLabel = (s) => s) {
  return buildClaimDmDetailed(a, sportLabel).text || '';
}

// ---------------------------------------------------------------------------
// Two-step Instagram DM (CEO GO 2026-11-17). Mirror of pw-hs-dashboard
// lib/foundingDm.js renderTwoStepMessage1Detailed / renderTwoStepMessage2; the
// parity fixture (tests/founding-dm-parity.json, twoStep) holds every case.
// Message 1: personal, NO link, no price; built only from her record.
export const TWO_STEP_DM_VERSION = 'pw-two-step-dm/2026-11-17.v1';
export const TWO_STEP_MSG1_MAX = 450;
const TWO_STEP_POSITION_WORDS = Object.freeze([
  ['outside hitter', /^(oh|outside|outside hitter|lh|left side)$/],
  ['middle blocker', /^(mb|mh|middle|middle blocker|middle hitter)$/],
  ['setter', /^(s|setter)$/],
  ['right side hitter', /^(rs|opp|opposite|right side|rh|right side hitter)$/],
  ['libero', /^(l|lib|libero)$/],
  ['defensive specialist', /^(ds|defensive specialist)$/],
]);
export function twoStepPositionWord(raw) {
  for (const part of String(raw || '').toLowerCase().split(/[\/,;|&]+/)) {
    const t = part.trim().replace(/\./g, '');
    for (const [word, rx] of TWO_STEP_POSITION_WORDS) if (rx.test(t)) return word;
  }
  return '';
}
export function twoStepCleanName(raw) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim().replace(/\s*\([A-Z]{2}\)$/, '');
  if (!t || t.length > 60 || /https?:|@|www\./i.test(t) || !/[A-Za-z]{2}/.test(t)) return '';
  if (t === t.toUpperCase() && t.length > 4) t = t.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Hs|Ms|Vbc|Vb|Usa)\b/g, (m) => m.toUpperCase());
  return t;
}
const twoStepRank = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
};
export function renderTwoStepMessage1Detailed({ firstName, grad, position, school, club, fwRank, state, stat } = {}) {
  const first = String(firstName || '').trim().split(/\s+/)[0] || '';
  const g = /^\d{4}$/.test(String(grad || '').trim()) ? String(grad).trim() : '';
  const rank = twoStepRank(fwRank);
  const stateName = stateNameOf(state);
  const parts = { position: twoStepPositionWord(position), school: twoStepCleanName(school), club: twoStepCleanName(club), stat: String(stat || '').trim().replace(/[.]+$/, '') };
  const build = (p) => {
    const where = [p.position, p.school].filter(Boolean).join(' at ');
    return `Hey ${first || 'there'}! Stephanie from Prospect Watch here.`
      + (rank && stateName && g ? ` Congrats on being ranked #${rank} in ${stateName}'s Class of ${g} on our Future Watch list!` : '')
      + ` Your ${g ? `Class of ${g} ` : ''}volleyball profile is live on our site`
      + (where ? `: ${where}` : '')
      + (p.club ? `, playing club for ${p.club}` : '')
      + (p.stat ? `, with ${p.stat}` : '')
      + '. You can claim it for free and update any of your information, add your photo, film and stats. Want me to send you the link?';
  };
  const p = { ...parts };
  let text = build(p);
  for (const k of ['stat', 'club', 'school', 'position']) {
    if (text.length <= TWO_STEP_MSG1_MAX) break;
    p[k] = '';
    text = build(p);
  }
  const used = ['firstName', 'grad', 'fwRank', 'position', 'school', 'club', 'stat'].filter((k) => (
    k === 'firstName' ? !!first : k === 'grad' ? !!g : k === 'fwRank' ? !!(rank && stateName && g) : !!p[k]));
  return { text, version: TWO_STEP_DM_VERSION, chars: text.length, used };
}
export const renderTwoStepMessage1 = (args = {}) => renderTwoStepMessage1Detailed(args).text;
export function renderTwoStepMessage2({ shortLink: link } = {}) {
  const l = String(link || '').trim();
  if (!/^https:\/\/\S+$/.test(l)) return null;
  return `Here you go: ${l}\n\nClaim your profile to update your information, add your photo, film and stats, compare your high school season with D1 players at your position, and build your school list.\n\nYou're also invited as a Founding Athlete. Your parent can see the membership offer on the same page.\n\nQuestions? Reply here or email stephanie@prospect-watch.com`;
}
/** Message 2's short link: the same /c/<code> invite page, ?s=2 for the two-step campaign. */
export const twoStepShortLink = (id) => { const l = shortLink(id); return l ? `${l}?s=2` : ''; };
