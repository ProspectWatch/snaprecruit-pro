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

/** The link the DM carries: personal invite for volleyball, claim link otherwise. */
export const dmLink = (a) => (isVolleyball(a.sport) ? inviteLink(a) : claimLink(a));

/** Instagram caps a DM at 1,000 characters (CEO 2026-11-02: "the DM is too long for IG"). */
export const DM_MAX_CHARS = 1000;

// Word for word pw-hs-dashboard lib/foundingDm.js FOUNDING_DM_MASTER_TEMPLATE.
export const FOUNDING_DM_GENERAL_TEMPLATE = `Hey {firstName}, it's Stephanie from Prospect Watch 👋

We help student athletes navigate NCAA recruiting, and you've been selected for our Founding Athlete offer: first access to our Athlete Center to build your college list and research every D1 program. Claiming your profile is free.

{personalLink}

Questions? Reply here or email stephanie@prospect-watch.com

Stephanie, Prospect Watch`;

// Word for word pw-hs-dashboard lib/foundingDm.js FOUNDING_DM_FW_RANKED_TEMPLATE.
export const FOUNDING_DM_FW_RANKED_TEMPLATE = `Hey {firstName}, it's Stephanie from Prospect Watch 👋

Congrats! You're #{rank} in the {stateName} Class of {grad} on our Future Watch list 🎉

We help student athletes navigate NCAA recruiting, and you've been selected for our Founding Athlete offer: first access to our Athlete Center to build your college list and research every D1 program. Claiming your profile is free.

{personalLink}

Your ranking doesn't depend on this offer. Questions? Reply here or email stephanie@prospect-watch.com

Stephanie, Prospect Watch`;

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

/**
 * The DM, short enough for Instagram. Volleyball: the RANKED Founding DM for
 * a Future Watch athlete ranked 1 to 100, else the GENERAL one, each word for
 * word pw-hs-dashboard lib/foundingDm.js, with the personal invite link.
 * Other sports (no Athlete Center yet): a claim-only version with the direct
 * claim link. Price and terms live on the page the link opens, never in the
 * DM. sportLabel turns a sport value into its display label.
 */
export function buildClaimDm(a, sportLabel = (s) => s) {
  const first = cleanPart(splitName(a.name).first) || 'there';
  if (isVolleyball(a.sport)) {
    const rank = rankedDmRank(a);
    const tpl = rank ? FOUNDING_DM_FW_RANKED_TEMPLATE : FOUNDING_DM_GENERAL_TEMPLATE;
    return tpl.replace('{firstName}', first).replace('{rank}', String(rank))
      .replace('{stateName}', stateNameOf(a.state)).replace('{grad}', String(Number(a.grad_year)))
      .replace('{personalLink}', inviteLink(a));
  }
  const close = "\n\nThis isn't a ranking or Future Watch selection. Questions? Reply here or email " + CONTACT_EMAIL + '\n\nStephanie\nProspect Watch';
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
