// PW Data Enrichment: the profile claim DM (CEO 2026-11-02).
//
// - Signed by Stephanie, with stephanie@prospect-watch.com for questions
//   ("make the messages signed as Stephanie with contact email as
//   stephanie@prospect-watch.com"). Cancellation stays at
//   info@prospect-watch.com, the address the Membership Terms name.
// - Volleyball athletes get their personal Prospect Watch invitation link
//   (/invite): their name animated in, then the Athlete Center landing with
//   its screens and the Founding Athlete offer. The link carries the HS
//   profile id so "Claim your profile" opens this athlete's own profile.
//   Mirrors pw-hs-dashboard lib/foundingInvite.js.
// - Other sports keep the direct claim link (the Athlete Center is volleyball
//   only).
// Copy: shortened for Instagram (CEO 2026-11-02); the volleyball DM is the
// pw-hs-dashboard lib/foundingDm.js master word for word. No em dashes.

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

/** The link the DM carries: personal invite for volleyball, claim link otherwise. */
export const dmLink = (a) => (isVolleyball(a.sport) ? inviteLink(a) : claimLink(a));

/** Instagram caps a DM at 1,000 characters (CEO 2026-11-02: "the DM is too long for IG"). */
export const DM_MAX_CHARS = 1000;

/**
 * The DM, short enough for Instagram. Volleyball: the Founding Athlete DM,
 * word for word the pw-hs-dashboard lib/foundingDm.js master, with the
 * athlete's personal invite link. Other sports (no Athlete Center yet): a
 * claim-only version with the direct claim link. Price and terms live on the
 * page the link opens, never in the DM. sportLabel turns a sport value into
 * its display label.
 */
export function buildClaimDm(a, sportLabel = (s) => s) {
  const first = cleanPart(splitName(a.name).first) || 'there';
  const close = "\n\nThis isn't a ranking or Future Watch selection. Questions? Reply here or email " + CONTACT_EMAIL + '\n\nStephanie\nProspect Watch';
  if (isVolleyball(a.sport)) {
    return "Hey " + first + ", it's Stephanie from Prospect Watch 👋\n\n"
      + 'Our staff has selected you for our Founding Athlete offer: first access to the new Prospect Watch Athlete Center. Claiming your profile is free.\n\n'
      + 'Take a look here: ' + inviteLink(a)
      + close;
  }
  const bits = [];
  const sport = a.sport ? sportLabel(a.sport) : '';
  if (sport) bits.push(sport);
  if (a.grad_year) bits.push('Class of ' + a.grad_year);
  const context = bits.length ? ' (' + bits.join(' · ') + ')' : '';
  return "Hey " + first + ", it's Stephanie from Prospect Watch 👋\n\n"
    + "We've built your recruiting profile" + context + '. Claiming it is free: check your info and add your own stats, highlights and photo.\n\n'
    + 'Claim it here: ' + claimLink(a)
    + close;
}
