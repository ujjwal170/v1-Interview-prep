/**
 * Adaptive Selector Service — pure selection logic.
 *
 * All functions are pure: they never mutate their inputs and always return
 * new values. Both functions accept an injectable `rng` parameter for
 * deterministic testing.
 *
 * Profile shape:
 *   {
 *     subtopics: {
 *       [name]: { level: number, attempts: number, lastSeen: number|null, history: number[] }
 *     },
 *     aggregate: number
 *   }
 *
 * @module adaptiveSelector
 */

/**
 * Get the level for a subtopic from the profile, returning 0 if not found.
 *
 * @param {string} subtopicName
 * @param {{ subtopics: Object }} profile
 * @returns {number}
 */
function getLevel(subtopicName, profile) {
  const sub = profile && profile.subtopics && profile.subtopics[subtopicName];
  return sub ? (sub.level ?? 0) : 0;
}

/**
 * Get the attempts count for a subtopic from the profile, returning 0 if not found.
 *
 * @param {string} subtopicName
 * @param {{ subtopics: Object }} profile
 * @returns {number}
 */
function getAttempts(subtopicName, profile) {
  const sub = profile && profile.subtopics && profile.subtopics[subtopicName];
  return sub ? (sub.attempts ?? 0) : 0;
}

/**
 * Pick a random element from an array using the provided rng function.
 *
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng - Returns a float in [0, 1).
 * @returns {T}
 */
function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Pick a random element from a bucket, preferring items NOT in the soft-exclude
 * set. If every item in the bucket is soft-excluded, fall back to picking from
 * the full bucket (so we never starve the FSM).
 *
 * @template T
 * @param {T[]} bucket
 * @param {Set<T>} softExcludeSet
 * @param {() => number} rng
 * @returns {T}
 */
function pickFromBucket(bucket, softExcludeSet, rng) {
  if (softExcludeSet.size === 0) return pickRandom(bucket, rng);
  const fresh = bucket.filter((s) => !softExcludeSet.has(s));
  if (fresh.length > 0) return pickRandom(fresh, rng);
  return pickRandom(bucket, rng);
}

/**
 * Pick the next subtopic according to the 60/30/10 adaptive strategy with
 * fallback ordering.
 *
 * Strategy (when intent === 'adaptive'):
 *   - 60% probability → pick from weak subtopics (level < 5, attempts > 0)
 *   - 30% probability → pick from unexplored subtopics (attempts === 0)
 *   - 10% probability → pick from strong subtopics (level >= 7)
 *
 * For non-adaptive intents (easy/medium/hard/mixed), the primary bucket is
 * always 'weak' (fixed-difficulty intents still bias toward weak areas).
 *
 * Fallback order when the chosen primary bucket is empty:
 *   primary → weak → unexplored → strong → any allowed
 *
 * Soft exclusion (`recentlyCovered`):
 *   The caller can pass a list of subtopics covered in the last few questions
 *   of the current session. Within whichever bucket gets picked, items in
 *   `recentlyCovered` are deprioritized — the selector picks from the fresh
 *   members of the bucket first, falling back to recently-covered items only
 *   if the bucket has no fresh members. This prevents the same subtopic from
 *   being selected on consecutive questions (which can otherwise happen in
 *   easy/medium/hard modes where one subtopic can dominate the "weak" bucket).
 *
 * Returns `null` if taxonomy is empty.
 *
 * @param {{ subtopics: Object, aggregate: number }} profile - Current skill profile.
 * @param {string[]} taxonomy - Array of all subtopic name strings for this topic.
 * @param {'easy'|'medium'|'hard'|'mixed'|'adaptive'} intent - Difficulty intent.
 * @param {{ rng?: () => number, recentlyCovered?: string[]|Set<string> }} [options]
 * @param {() => number} [options.rng=Math.random] - RNG function for testability.
 * @param {string[]|Set<string>} [options.recentlyCovered=[]] - Soft-exclude list.
 * @returns {{ subtopic: string, category: 'weak'|'unexplored'|'strong'|'any' }|null}
 */
export function pickNextSubtopic(
  profile,
  taxonomy,
  intent,
  { rng = Math.random, recentlyCovered = [] } = {}
) {
  const recentSet =
    recentlyCovered instanceof Set ? recentlyCovered : new Set(recentlyCovered || []);

  const allowed = taxonomy || [];

  // If nothing is allowed, return null.
  if (allowed.length === 0) return null;

  // Partition allowed subtopics into the three buckets.
  const weak = allowed.filter(
    (s) => getAttempts(s, profile) > 0 && getLevel(s, profile) < 5
  );
  const unexplored = allowed.filter((s) => getAttempts(s, profile) === 0);
  const strong = allowed.filter((s) => getLevel(s, profile) >= 7);

  // Determine the primary bucket based on intent and a random draw.
  let primary;
  if (intent === 'adaptive') {
    const r = rng();
    if (r < 0.6) {
      primary = weak;
    } else if (r < 0.9) {
      primary = unexplored;
    } else {
      primary = strong;
    }
  } else {
    // Fixed-difficulty intents (easy/medium/hard/mixed) — prefer unexplored
    // first so a fresh session explores the taxonomy, fall back to weak,
    // then strong, then any. This avoids the "first-question subtopic
    // dominates" trap that happens when 'weak' is the primary bucket and
    // unexplored items have not yet entered any bucket.
    primary = unexplored.length > 0 ? unexplored : weak;
  }

  // Map a bucket array back to its category name.
  function bucketCategory(bucket) {
    if (bucket === weak) return 'weak';
    if (bucket === unexplored) return 'unexplored';
    if (bucket === strong) return 'strong';
    return 'any';
  }

  // Fallback order: primary → unexplored → weak → strong → any allowed.
  // (For adaptive intent, primary is one of weak/unexplored/strong; for fixed
  //  intents, primary is unexplored or weak as set above.)
  const fallbackOrder = [primary, unexplored, weak, strong, allowed];
  for (const bucket of fallbackOrder) {
    if (bucket.length > 0) {
      const subtopic = pickFromBucket(bucket, recentSet, rng);
      const category = bucketCategory(bucket);
      return { subtopic, category };
    }
  }

  // Should never reach here since allowed.length > 0 was checked above,
  // but return null as a safety net.
  return null;
}

/**
 * Compute the integer difficulty target for the next question.
 *
 * Rules:
 *   - 'easy'   → uniform random integer in [1, 4]
 *   - 'medium' → uniform random integer in [5, 7]
 *   - 'hard'   → uniform random integer in [7, 10]
 *   - 'mixed'  → uniform random integer in [1, 10]
 *   - 'adaptive' + category 'strong' → min(10, ceil(subtopicLevel) + 1)
 *   - 'adaptive' + subtopicLevel is null/undefined/NaN → 5 (first-session fallback)
 *   - 'adaptive' otherwise → clamp(round(subtopicLevel), 1, 10)
 *
 * @param {'easy'|'medium'|'hard'|'mixed'|'adaptive'} intent - Difficulty intent.
 * @param {number|null|undefined} subtopicLevel - Current level of the selected subtopic.
 * @param {'weak'|'unexplored'|'strong'|'any'} category - Category of the selected subtopic.
 * @param {{ rng?: () => number }} [options] - Optional options object.
 * @param {() => number} [options.rng=Math.random] - RNG function for testability.
 * @returns {number} Integer in [1, 10].
 */
export function computeDifficultyTarget(
  intent,
  subtopicLevel,
  category,
  { rng = Math.random } = {}
) {
  // Helper: random integer in [min, max] inclusive.
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;

  // Fixed-difficulty intents — now use ranges instead of constants.
  if (intent === 'easy') return randInt(1, 4);
  if (intent === 'medium') return randInt(5, 7);
  if (intent === 'hard') return randInt(7, 10);

  // Mixed: uniform random integer in [1, 10] inclusive.
  if (intent === 'mixed') return randInt(1, 10);

  // Adaptive intent below this point.

  // Strong reinforcement: push one level above current, capped at 10.
  if (category === 'strong') {
    return Math.min(10, Math.ceil(subtopicLevel) + 1);
  }

  // First-session fallback: level is null, undefined, or NaN.
  if (subtopicLevel == null || (typeof subtopicLevel === 'number' && isNaN(subtopicLevel))) {
    return 5;
  }

  // General adaptive: clamp(round(level), 1, 10).
  return Math.min(10, Math.max(1, Math.round(subtopicLevel)));
}
