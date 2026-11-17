// Mirror of ProspectWatch/pw-hs-dashboard lib/claimProfileOutreach.cjs. Update there first.
/**
 * Prospect Watch free-profile outreach, 2026-11-17.
 * Pure renderer: no network, database, sending, tracking writes or storage.
 * Call only AFTER the application's existing recipient/consent/suppression gates.
 * This module adds validation; it does not replace or waive those gates.
 */
const VERSION = 'pw-free-profile-claim/2026-11-17.v2';
const BASE = 'https://verified.prospect-watch.com';
const CONTACT = 'stephanie@prospect-watch.com';
const TWO_STEP_CAMPAIGN = 'dm_two_step_202611';
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
  // State rankings require their own publication. A Future Watch selection is
  // not a state ranking.
  return ctx.publicationVerified === true && ctx.rankSource === 'published_pw_state_final' &&
    Number.isSafeInteger(rank) && rank >= 1 && state && grad && url
    ? { rank, state, grad, url } : null;
}

/**
 * @param {object} ctx Athlete facts and app-verified eligibility flags.
 * @param {{channel?:'dm'|'email',audience?:'athlete'|'guardian',variant?:'general'|'ranked'|'followup'|'intro'|'reply',includeFooter?:boolean}} opts
 * @returns {{ok:boolean,version:string,subject:string|null,body:string|null,reasons:string[],variant:string,chars:number}}
 */
function render(ctx = {}, opts = {}) {
  const channel = opts.channel || 'dm', audience = opts.audience || 'athlete';
  const published = channel === 'dm' ? publication(ctx) : null;
  const requested = opts.variant || 'general';
  const variant = requested === 'ranked' && !published ? 'general' : requested;
  const reasons = [];
  const result = (subject, body) => ({ ok: reasons.length === 0, version: VERSION, subject: reasons.length ? null : subject,
    body: reasons.length ? null : body, reasons, variant, chars: body ? [...body].length : 0 });
  if (!['dm', 'email'].includes(channel) || !['athlete', 'guardian'].includes(audience) || !['general', 'ranked', 'followup', 'intro', 'reply'].includes(variant)) reasons.push('Invalid channel, audience or template.');
  if (ctx.eligibilityChecked !== true) reasons.push('Use the existing app contact, identity and consent checks first.');
  if (ctx.suppressionChecked !== true || ctx.suppressed === true) reasons.push('Recipient suppression and opt-out check must pass.');
  if (ctx.profileUnclaimed !== true) reasons.push('Confirm this profile is still unclaimed; do not invite an existing claimant to claim again.');
  if (ctx.hasReplied === true && variant !== 'reply') reasons.push('A reply needs staff handling; stop the claim-reminder sequence.');
  const first = name(ctx.athleteFirst), parent = name(ctx.recipientFirst), grad = year(ctx.gradYear);
  if (!first) reasons.push('A verified athlete first name is required.');
  const link = ctx.athleteId ? buildClaimUrl(ctx.athleteId) : safeClaimUrl(ctx.claimUrl);
  if (!link) reasons.push('Use the app\'s verified personal claim/invite link or canonical athlete UUID, not a checkout link.');
  const pub = variant === 'ranked' ? published : null;
  const stages = ctx.twoStep || {};
  if (variant === 'intro' && (channel !== 'dm' || stages.msg1 || stages.replied || stages.msg2)) reasons.push('Message 1 is only for a new two-step outreach.');
  if (variant === 'reply' && (channel !== 'dm' || !stages.msg1 || !stages.replied || stages.msg2)) reasons.push('Copy Message 2 after Message 1 and a recorded reply, before Message 2 is sent.');
  if (variant === 'followup' && (ctx.priorClaimMessageSent !== true || !Number.isInteger(ctx.followupCount) || ctx.followupCount !== 0)) reasons.push('Use this reminder only after one real initial claim message, with no prior claim follow-up.');
  if (channel === 'email' && opts.includeFooter && (!clean(ctx.marketingFooter) || /\[[^\]]+\]|\{\{/.test(ctx.marketingFooter))) reasons.push('Supply the existing recipient-specific PW Office marketing footer without placeholders.');
  if (reasons.length) return result(null, null);
  const toGuardian = audience === 'guardian';
  const greeting = channel === 'dm'
    ? `Hey ${toGuardian ? (parent ? `${parent} and ${first}` : `${first}'s family`) : first}, it’s Stephanie from Prospect Watch.`
    : `Hi ${toGuardian ? (parent ? `${parent} and ${first}` : `${first}'s family`) : first},`;
  const possessive = toGuardian ? `${first}'s` : 'your';
  const profile = toGuardian ? `${first}'s` : 'your';
  const playerProfile = `${profile}${grad ? ` Class of ${grad}` : ''} volleyball profile`;
  const signoff = 'Questions? Just reply here!\n\nStephanie | Prospect Watch';
  let body, subject = null;
  if (variant === 'followup') {
    const intro = channel === 'dm' ? greeting : `${greeting}\n\nIt's Stephanie from Prospect Watch.`;
    body = `${intro}\n\nJust following up with the link to claim ${possessive} free Prospect Watch profile:\n${link}\n\nNo purchase is required. Reply if you need help; otherwise, I'll leave it with you and won't send another claim reminder.`;
    if (channel === 'dm') body += `\n\n${CONTACT}`;
    else { subject = `The link to claim ${first}'s free Prospect Watch profile`; body += `\n\nStephanie\nProspect Watch\n${CONTACT}`; }
  } else if (variant === 'intro') {
    body = `${greeting}

We’ve built ${playerProfile} as part of our growing volleyball recruiting platform.

We’d love to invite ${toGuardian ? 'your family' : 'you'} to claim it for free, update ${toGuardian ? 'the' : 'your'} information, and learn more about the Athlete Center.

Would you like me to send you ${toGuardian ? 'the' : 'your'} personal claim link?`;
  } else if (variant === 'reply') {
    const trackedLink = new URL(link);
    trackedLink.searchParams.set('utm_source', 'instagram');
    trackedLink.searchParams.set('utm_medium', 'dm');
    trackedLink.searchParams.set('utm_campaign', TWO_STEP_CAMPAIGN);
    const recipient = toGuardian ? (parent || `${first}'s family`) : first;
    body = `Thanks, ${recipient}!

Here’s ${toGuardian ? 'the' : 'your'} personal link to claim ${possessive} Prospect Watch volleyball profile for FREE:

${trackedLink}

You can review ${toGuardian ? 'the' : 'your'} information, add ${toGuardian ? '' : 'your '}stats and highlights, and start building ${toGuardian ? 'the' : 'your'} recruiting profile.

Let me know if you have any questions!`;
  } else if (channel === 'dm') {
    body = pub
      ? `${greeting}

${toGuardian ? `Congratulations to ${first} on being` : 'Congratulations on being'} ranked #${pub.rank} in ${pub.state} for the Class of ${pub.grad}!

${toGuardian ? `${first}'s` : 'Your'} Prospect Watch volleyball profile is available, and we’d love for ${toGuardian ? 'your family' : 'you'} to claim it.

Claiming is FREE and allows you to review ${toGuardian ? 'the' : 'your'} player information, add stats and highlights, and start building ${toGuardian ? 'a' : 'your'} presence on Prospect Watch.

${link}

Published ranking: ${pub.url}

${signoff}`
      : `${greeting}

We’ve built ${playerProfile} and want to invite ${toGuardian ? 'your family' : 'you'} to claim it.

Prospect Watch is building a better way for athletes to showcase their game, explore college programs, and understand their recruiting opportunities.

Claim ${possessive} profile for FREE to review ${toGuardian ? 'the' : 'your'} information, add ${toGuardian ? '' : 'your '}stats and highlights, and get started.

${link}

${signoff}`;
  } else {
    subject = toGuardian ? `${first}'s Prospect Watch volleyball profile is ready` : `${first}, your Prospect Watch volleyball profile is ready`;
    body = `${greeting}

${toGuardian ? `${first}’s` : 'Your'} volleyball recruiting journey deserves more than just another player profile.

At Prospect Watch, we’re building a platform to help athletes take ownership of their recruiting information, showcase their development, and make more informed decisions about their future.

We’ve created ${playerProfile}, and we’d like to invite ${toGuardian ? 'your family' : 'you'} to claim it.

Your first step is completely FREE.

Once you’ve claimed ${toGuardian ? 'the' : 'your'} profile, you can:

Take ownership of ${toGuardian ? 'the' : 'your'} profile: Review ${toGuardian ? 'the' : 'your'} information and request corrections.

Showcase ${toGuardian ? 'the' : 'your'} game: Add ${toGuardian ? '' : 'your '}stats, photos, and highlight film.

Keep ${toGuardian ? '' : 'your '}recruiting information current: Update ${toGuardian ? 'the' : 'your'} playing profile as ${toGuardian ? 'the athlete develops' : 'you develop'}.

Explore the Athlete Center: Discover the recruiting research, college intelligence, and comparison tools available through Prospect Watch.

CLAIM YOUR FREE PROFILE

${link}

There is no purchase required to claim the profile. Optional PW Verified membership and additional Athlete Center features are available separately.

We look forward to following ${toGuardian ? `${first}’s` : 'your'} journey.

Stephanie
Prospect Watch
https://prospect-watch.com`;
  }
  if (channel === 'email' && opts.includeFooter) body += `\n\n${String(ctx.marketingFooter).trim()}`;
  // Never cut a personal link, proof, or mandatory text to squeeze into a DM.
  if (pub && [...body].length > 700) return render(ctx, { ...opts, variant: 'general' });
  if (channel === 'dm' && [...body].length > 700) reasons.push('DM exceeds 700 characters. Use the existing verified short link or reduce optional details; never truncate a link.');
  return result(subject, body);
}

export { VERSION, buildClaimUrl, safeClaimUrl, safeRankingUrl, render };
