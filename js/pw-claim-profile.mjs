// Mirror of ProspectWatch/pw-hs-dashboard lib/claimProfileOutreach.cjs. Update there first.
/**
 * Prospect Watch free-profile outreach, 2026-11-17.
 * Pure renderer: no network, database, sending, tracking writes or storage.
 * Call only AFTER the application's existing recipient/consent/suppression gates.
 * This module adds validation; it does not replace or waive those gates.
 */
const VERSION = 'pw-free-profile-claim/2026-11-18.v3-email';
const BASE = 'https://verified.prospect-watch.com';
const CONTACT = 'stephanie@prospect-watch.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (s) => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '';
const bad = (s) => /\[|\]|\{|\}|<|>|\u2014|[\r\n]/.test(s);
const name = (s) => { const t = clean(s); return t && t.length <= 50 && !bad(t) ? t : ''; };
const year = (v) => /^20\d{2}$/.test(String(v || '')) ? String(v) : '';

function safeClaimUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if (u.protocol !== 'https:' || u.hostname !== 'verified.prospect-watch.com' || u.port || u.username || u.password) return null;
    if (!(['/claim', '/invite'].includes(u.pathname) || /^\/c\/[0-9a-f]{10}$/.test(u.pathname))) return null;
    if (/\{|\}|\[|\]|\s/.test(String(raw))) return null;
    // Do not turn a paid-offer intent or a checkout link into a free-claim CTA.
    if (/founding|paid|purchase|checkout/i.test(u.searchParams.get('intent') || '')) return null;
    if (u.hash && /founding|offer|checkout/i.test(u.hash)) return null;
    return u.toString();
  } catch { return null; }
}

/** Direct claim route already present in pages/claim.js; no new route/feature. */
function buildClaimUrl(athleteId) {
  if (typeof athleteId !== 'string' || !UUID.test(athleteId)) return null;
  return `${BASE}/claim?id=${athleteId.toLowerCase()}`;
}

function safeRankingUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    const pw = u.hostname === 'prospect-watch.com' || u.hostname.endsWith('.prospect-watch.com');
    const ig = ['instagram.com', 'www.instagram.com'].includes(u.hostname) && /^\/(p|reel)\/[^/]+/.test(u.pathname);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !(pw || ig)) return null;
    if (/\{|\}|\[|\]|\s/.test(String(raw)) || u.pathname === '/' || u.pathname.startsWith('/api/')) return null;
    return u.toString();
  } catch { return null; }
}

function publication(ctx) {
  const rank = Number(ctx.finalRank);
  const state = name(ctx.stateName), grad = year(ctx.gradYear), url = safeRankingUrl(ctx.rankingUrl);
  // Existing campaign scope: published FINAL Future Watch top-100 rank.
  // Auto rank, provisional rank, PIR and a score are NOT a publication.
  return ctx.publicationVerified === true && ctx.rankSource === 'published_future_watch_final' &&
    Number.isInteger(rank) && rank >= 1 && rank <= 100 && state && grad && url
    ? { rank, state, grad, url } : null;
}

/**
 * @param {object} ctx Athlete facts and app-verified eligibility flags.
 * @param {{channel?:'dm'|'email',audience?:'athlete'|'guardian',variant?:'general'|'ranked'|'followup',includeFooter?:boolean}} opts
 * @returns {{ok:boolean,version:string,subject:string|null,body:string|null,reasons:string[],variant:string,chars:number}}
 */
function render(ctx = {}, opts = {}) {
  const channel = opts.channel || 'dm', audience = opts.audience || 'athlete', variant = opts.variant || 'general';
  const reasons = [];
  const result = (subject, body) => ({ ok: reasons.length === 0, version: VERSION, subject: reasons.length ? null : subject,
    body: reasons.length ? null : body, reasons, variant, chars: body ? [...body].length : 0 });
  if (!['dm', 'email'].includes(channel) || !['athlete', 'guardian'].includes(audience) || !['general', 'ranked', 'followup'].includes(variant)) reasons.push('Invalid channel, audience or template.');
  if (ctx.eligibilityChecked !== true) reasons.push('Use the existing app contact, identity and consent checks first.');
  if (ctx.suppressionChecked !== true || ctx.suppressed === true) reasons.push('Recipient suppression and opt-out check must pass.');
  if (ctx.profileUnclaimed !== true) reasons.push('Confirm this profile is still unclaimed; do not invite an existing claimant to claim again.');
  if (ctx.hasReplied === true) reasons.push('A reply needs staff handling; stop the claim-reminder sequence.');
  const first = name(ctx.athleteFirst), parent = name(ctx.recipientFirst), grad = year(ctx.gradYear);
  if (!first) reasons.push('A verified athlete first name is required.');
  const link = ctx.athleteId ? buildClaimUrl(ctx.athleteId) : safeClaimUrl(ctx.claimUrl);
  if (!link) reasons.push('Use the app\'s verified personal claim/invite link or canonical athlete UUID, not a checkout link.');
  const pub = variant === 'ranked' ? publication(ctx) : null;
  if (variant === 'ranked' && !pub) reasons.push('Ranked copy needs a verified published FINAL rank, state, class and accessible publication link.');
  if (variant === 'followup' && (ctx.priorClaimMessageSent !== true || !Number.isInteger(ctx.followupCount) || ctx.followupCount !== 0)) reasons.push('Use this reminder only after one real initial claim message, with no prior claim follow-up.');
  if (channel === 'email' && opts.includeFooter && (!clean(ctx.marketingFooter) || /\[[^\]]+\]|\{\{/.test(ctx.marketingFooter))) reasons.push('Supply the existing recipient-specific PW Office marketing footer without placeholders.');
  if (reasons.length) return result(null, null);
  const toGuardian = audience === 'guardian';
  const greeting = channel === 'dm'
    ? `Hey ${toGuardian ? (parent ? `${parent} and ${first}` : `${first}'s family`) : first}, it's Stephanie from Prospect Watch.`
    : `Hi ${toGuardian ? (parent ? `${parent} and ${first}` : `${first}'s family`) : first},`;
  const possessive = toGuardian ? `${first}'s` : 'your';
  const profile = toGuardian ? `${first}'s` : 'Your';
  let body, subject = null;
  if (variant === 'followup') {
    const intro = channel === 'dm' ? greeting : `${greeting}\n\nIt's Stephanie from Prospect Watch.`;
    body = `${intro}\n\nJust following up with the link to claim ${possessive} free Prospect Watch profile:\n${link}\n\nNo purchase is required. Reply if you need help; otherwise, I'll leave it with you and won't send another claim reminder.`;
    if (channel === 'dm') body += `\n\n${CONTACT}`;
    else { subject = `The link to claim ${first}'s free Prospect Watch profile`; body += `\n\nStephanie\nProspect Watch\n${CONTACT}`; }
  } else if (variant === 'general') {
    const playerProfile = `${possessive}${grad ? ` Class of ${grad}` : ''} volleyball profile`;
    if (channel === 'dm') {
      body = `${greeting}

We've built ${playerProfile}, and I'd love to invite ${toGuardian ? 'your family' : 'you'} to claim it!

Claim ${possessive} profile for FREE to review ${toGuardian ? 'the' : 'your'} information and add stats and highlights.

Optional Athlete Center membership includes advanced recruiting tools, such as research on D1 volleyball programs.

${toGuardian ? 'Claim the profile here:' : 'Claim yours here:'}
${link}

Questions? I'm happy to help!

Stephanie | Prospect Watch`;
    } else {
      subject = toGuardian ? `${first}'s Prospect Watch volleyball profile is ready` : `${first}, your Prospect Watch volleyball profile is ready`;
      // CEO final email correction, 2026-11-18. Free profile and paid
      // membership are kept apart, and every line is checked against the
      // production plan in lib/acFeatures.js: Playing Profile (stats, photos,
      // video) and the Recruiting Roadmap are 'free'; School Intelligence,
      // Athlete Intelligence and Find Schools (college research) are 'member'.
      // No price here: pricing, renewal and eligibility live on the offer page.
      const your = toGuardian ? `${first}'s` : 'your';
      body = `${greeting}

I'm Stephanie from Prospect Watch. We've created ${playerProfile}, and I'd like to invite ${toGuardian ? 'your family' : 'you'} to claim it.

Claiming the profile is FREE. With the free profile, ${toGuardian ? 'your family' : 'you'} can:

Review ${your} information: Check the playing details and request corrections.

Build ${your} recruiting profile: Add stats, player photos and highlight video.

Follow the Recruiting Roadmap: See the next steps in ${your} recruiting.

CLAIM ${toGuardian ? `${first.toUpperCase()}'S` : 'YOUR'} FREE PROFILE
${link}

There is no purchase required to claim the profile.

Optional paid Athlete Center membership
College research, School Intelligence and Athlete Intelligence require a paid Athlete Center membership. They are not part of the free profile.

${toGuardian ? `${first} is` : "You're"} also eligible to review our Founding Athlete membership offer. Pricing, renewal terms and eligibility are shown on the offer page:
${BASE}/founding-athlete

Stephanie
Prospect Watch
https://prospect-watch.com`;
    }
  } else if (channel === 'dm') {
    const opener = pub
      ? `${toGuardian ? first + ' is' : "You're"} ranked #${pub.rank} on Prospect Watch's ${pub.state} Class of ${pub.grad} Future Watch list.`
      : `${profile}${grad ? ` Class of ${grad}` : ''} volleyball profile is ready to claim for FREE.`;
    body = `${greeting}\n\n${opener}\n\nClaim ${possessive} free profile to review the playing information, request corrections, and add stats, a photo and highlight film:\n${link}`;
    if (pub) body += `\n\nView the published ranking:\n${pub.url}`;
    body += `\n\nNo purchase required. Questions? Reply here or email ${CONTACT}`;
  } else {
    subject = pub ? `${first}, your published ranking and free Prospect Watch profile` : `Claim ${first}'s FREE Prospect Watch profile`;
    const opener = pub
      ? `${toGuardian ? first + ' is' : "You're"} ranked #${pub.rank} on Prospect Watch's ${pub.state} Class of ${pub.grad} Future Watch list.`
      : `${profile}${grad ? ` Class of ${grad}` : ''} volleyball profile is ready to claim for free.`;
    body = `${greeting}\n\nI'm Stephanie from Prospect Watch. ${opener}\n\nClaiming the profile lets ${toGuardian ? 'your family' : 'you'} review the playing information, request corrections, and add stats, a profile photo and highlight film.\n\nClaim ${possessive} free profile:\n${link}`;
    if (pub) body += `\n\nView the published ranking:\n${pub.url}`;
    body += `\n\nNo purchase is required to claim the profile. ${pub ? 'Claiming or purchasing a membership does not change a ranking.\n\n' : ''}Reply if you need help finding the profile or completing the claim.\n\nStephanie\nProspect Watch\n${CONTACT}`;
  }
  if (channel === 'email' && opts.includeFooter) body += `\n\n${String(ctx.marketingFooter).trim()}`;
  // Never cut a personal link, proof, or mandatory text to squeeze into a DM.
  if (channel === 'dm' && [...body].length > 700) reasons.push('DM exceeds 700 characters. Use the existing verified short link or reduce optional details; never truncate a link.');
  return result(subject, body);
}

export { VERSION, buildClaimUrl, safeClaimUrl, safeRankingUrl, render };
