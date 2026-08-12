export const ENRICHMENT_VERSION = '1.0.0';

export const SOURCE_CATEGORIES = Object.freeze({
  OFFICIAL_SCHOOL: 'official_school',
  OFFICIAL_COLLEGE: 'official_college',
  GOVERNING_BODY: 'governing_body',
  CLUB: 'club',
  EVENT: 'event',
  EDITORIAL: 'editorial',
  ATHLETE_PUBLIC_PROFILE: 'athlete_public_profile',
  MANUAL: 'manual'
});

export const SOURCE_RELIABILITY = Object.freeze({
  official_college: 0.98,
  official_school: 0.95,
  governing_body: 0.95,
  club: 0.85,
  event: 0.80,
  editorial: 0.75,
  athlete_public_profile: 0.65,
  manual: 0.70
});

export const OBSERVATION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  SUPERSEDED: 'superseded',
  CONFLICT: 'conflict'
});

export const MATCH_DECISION = Object.freeze({
  AUTO_MATCH: 'auto_match',
  LIKELY_MATCH: 'likely_match',
  HUMAN_REVIEW: 'human_review',
  DISCOVERY_CANDIDATE: 'discovery_candidate'
});

export const MATCH_THRESHOLDS = Object.freeze({
  AUTO_MATCH_MIN: 0.97,
  LIKELY_MATCH_MIN: 0.85,
  HUMAN_REVIEW_MIN: 0.65
});

export const ATHLETE_FIELDS = Object.freeze([
  'first_name',
  'last_name',
  'sport',
  'gender',
  'grad_year',
  'position',
  'secondary_position',
  'high_school',
  'club_team',
  'city',
  'state_province',
  'country',
  'height',
  'jersey_number',
  'commitment_status',
  'committed_school',
  'national_rank',
  'state_rank',
  'instagram_handle',
  'profile_photo_url',
  'action_photo_url',
  'award',
  'stat_line',
  'roster_presence'
]);

export const MATCH_SIGNALS = Object.freeze({
  exact_name: 0.30,
  sport: 0.10,
  grad_year: 0.18,
  state_province: 0.10,
  high_school: 0.14,
  club_team: 0.10,
  position: 0.05,
  source_profile_identity: 0.03
});

export function classifyMatch(score) {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new TypeError('score must be a number between 0 and 1');
  }
  if (score >= MATCH_THRESHOLDS.AUTO_MATCH_MIN) return MATCH_DECISION.AUTO_MATCH;
  if (score >= MATCH_THRESHOLDS.LIKELY_MATCH_MIN) return MATCH_DECISION.LIKELY_MATCH;
  if (score >= MATCH_THRESHOLDS.HUMAN_REVIEW_MIN) return MATCH_DECISION.HUMAN_REVIEW;
  return MATCH_DECISION.DISCOVERY_CANDIDATE;
}

export function sourceReliability(category) {
  return SOURCE_RELIABILITY[category] ?? 0.50;
}

export function buildObservation({
  athleteId = null,
  discoveryCandidateId = null,
  field,
  value,
  sourceId,
  sourceUrl,
  sourceCategory,
  observedAt = new Date().toISOString(),
  extractionMethod = 'connector',
  confidence = null,
  raw = null
}) {
  if (!ATHLETE_FIELDS.includes(field)) throw new TypeError(`Unsupported enrichment field: ${field}`);
  if (!sourceId) throw new TypeError('sourceId is required');
  if (!sourceUrl) throw new TypeError('sourceUrl is required');
  if (!sourceCategory) throw new TypeError('sourceCategory is required');
  if (value === undefined || value === null || value === '') throw new TypeError('value is required');

  const resolvedConfidence = confidence == null
    ? sourceReliability(sourceCategory)
    : Number(confidence);

  if (!Number.isFinite(resolvedConfidence) || resolvedConfidence < 0 || resolvedConfidence > 1) {
    throw new TypeError('confidence must be between 0 and 1');
  }

  return {
    version: ENRICHMENT_VERSION,
    athlete_id: athleteId,
    discovery_candidate_id: discoveryCandidateId,
    field,
    value,
    source_id: sourceId,
    source_url: sourceUrl,
    source_category: sourceCategory,
    observed_at: observedAt,
    extraction_method: extractionMethod,
    confidence: resolvedConfidence,
    status: OBSERVATION_STATUS.PENDING,
    raw
  };
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function exactSignal(a, b) {
  if (a == null || b == null || a === '' || b === '') return null;
  return normalizeText(a) === normalizeText(b);
}

/**
 * Deterministic weighted score for candidate matching.
 * Null signals are ignored and weights are re-normalized across evidence present.
 * This intentionally does not merge anything; it only classifies a candidate.
 */
export function scoreAthleteMatch(existing, candidate) {
  const signals = {
    exact_name: exactSignal(`${existing.first_name || ''} ${existing.last_name || ''}`, `${candidate.first_name || ''} ${candidate.last_name || ''}`),
    sport: exactSignal(existing.sport, candidate.sport),
    grad_year: exactSignal(existing.grad_year, candidate.grad_year),
    state_province: exactSignal(existing.state_province || existing.state, candidate.state_province || candidate.state),
    high_school: exactSignal(existing.high_school || existing.school, candidate.high_school || candidate.school),
    club_team: exactSignal(existing.club_team, candidate.club_team),
    position: exactSignal(existing.position, candidate.position),
    source_profile_identity: exactSignal(existing.source_profile_identity, candidate.source_profile_identity)
  };

  let availableWeight = 0;
  let earnedWeight = 0;
  for (const [signal, weight] of Object.entries(MATCH_SIGNALS)) {
    if (signals[signal] == null) continue;
    availableWeight += weight;
    if (signals[signal]) earnedWeight += weight;
  }

  const score = availableWeight ? earnedWeight / availableWeight : 0;
  return {
    score,
    decision: classifyMatch(score),
    signals
  };
}
