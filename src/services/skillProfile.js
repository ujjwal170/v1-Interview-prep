/**
 * Skill Profile Service — pure update functions.
 *
 * All functions are pure: they never mutate their inputs and always return
 * new objects. The persistence wrapper that calls Dexie is separate; the
 * math here is testable in isolation.
 *
 * Profile shape:
 *   {
 *     subtopics: {
 *       [name]: { level: number, attempts: number, lastSeen: number|null, history: number[] }
 *     },
 *     aggregate: number
 *   }
 */

/**
 * Compute the difficulty-weighted score from the raw evaluation score.
 *
 * Multiplier = difficulty / 5, so:
 *  - easy (diff 3):  raw * 0.6  (high score on easy is not "strong")
 *  - medium (diff 5): raw * 1.0  (baseline — no scaling)
 *  - hard (diff 8):  raw * 1.6  (high score on hard demonstrates strength)
 *
 * Capped at 10 so the level stays in [0, 10].
 *
 * @param {number} rawScore - 0..10 from the evaluator.
 * @param {number} difficulty - 1..10 the question was generated at.
 * @returns {number} Weighted score in [0, 10].
 */
export function weightedScore(rawScore, difficulty) {
  if (typeof rawScore !== 'number' || rawScore < 0) return 0;
  const diff = typeof difficulty === 'number' && difficulty > 0 ? difficulty : 5;
  const weighted = rawScore * (diff / 5);
  return Math.max(0, Math.min(10, weighted));
}

/**
 * Compute the mastery level for a subtopic from its score history.
 *
 * - Empty history  → 0
 * - One entry      → that entry
 * - Two or more    → arithmetic mean of the last two entries
 *
 * @param {number[]} history - Array of evaluation scores (0–10).
 * @returns {number} Level in [0, 10].
 */
export function computeLevel(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;
  if (history.length === 1) return history[0];
  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];
  return (secondLast + last) / 2;
}

/**
 * Compute the topic-level aggregate as the attempts-weighted average of all
 * subtopic levels.
 *
 * Only subtopics with `attempts > 0` contribute to the weighted average.
 * Returns 0 when total attempts across all subtopics is 0.
 *
 * @param {{ [name]: { level: number, attempts: number } }} subtopics
 * @returns {number} Aggregate in [0, 10].
 */
export function computeAggregate(subtopics) {
  if (!subtopics || typeof subtopics !== 'object') return 0;

  let totalAttempts = 0;
  let weightedSum = 0;

  for (const sub of Object.values(subtopics)) {
    if (sub.attempts > 0) {
      weightedSum += sub.level * sub.attempts;
      totalAttempts += sub.attempts;
    }
  }

  if (totalAttempts === 0) return 0;
  return weightedSum / totalAttempts;
}

/**
 * Apply one evaluation result to a skill profile.
 *
 * Steps (all pure — returns a new profile, never mutates the input):
 *  1. Guard: if the question difficulty is more than 2 points below the user's
 *     current level for this subtopic, treat it as practice-only and return
 *     the profile unchanged. This prevents trivially-easy questions from
 *     dragging a high-level user's score down via the difficulty-weighted
 *     formula. (See the "easy-question regression" bug fix.)
 *  2. Append `score` to the subtopic's history, truncate to the last 5 entries.
 *  3. Recompute the subtopic level (mean of last 2, or single entry, or 0).
 *  4. Increment the subtopic `attempts` counter by 1.
 *  5. Set `lastSeen` to `timestamp`.
 *  6. Recompute the topic aggregate as the attempts-weighted average.
 *
 * If the subtopic does not yet exist in the profile it is created with
 * sensible defaults before the update is applied.
 *
 * @param {{ subtopics: Object, aggregate: number }} profile - Current profile.
 * @param {string} subtopicName - Name of the subtopic being evaluated.
 * @param {number} score - Evaluation score (0–10).
 * @param {number} timestamp - Evaluation timestamp (e.g. Date.now()).
 * @param {number} [difficulty=5] - Question difficulty (1–10) used for weighting.
 *                                   Defaults to 5 (no scaling) for backward compatibility.
 * @returns {{ subtopics: Object, aggregate: number }} New profile object,
 *   or the original profile (unchanged) when the question was too easy to
 *   be informative.
 */
export function applyEvaluation(profile, subtopicName, score, timestamp, difficulty = 5) {
  // Deep-copy the subtopics map so we never mutate the input.
  const prevSubtopics = (profile && profile.subtopics) ? profile.subtopics : {};

  // ── Guard: skip update when difficulty is too easy for current level ──
  // The current level is read BEFORE any modification. New subtopics have a
  // level of 0, so the guard is effectively disabled until the user has at
  // least one prior recorded score (which is the desired behavior — every
  // first-time question should count).
  const currentLevel = prevSubtopics[subtopicName]?.level ?? 0;
  if (
    typeof difficulty === 'number' &&
    difficulty < currentLevel - 2
  ) {
    // Practice-only: history, level, attempts, lastSeen, and aggregate are
    // all preserved. Return a normalized profile shape so callers can rely
    // on the shape regardless of input.
    return {
      subtopics: prevSubtopics,
      aggregate: profile?.aggregate ?? computeAggregate(prevSubtopics),
    };
  }

  // Apply difficulty weighting before storing
  const weightedScoreValue = weightedScore(score, difficulty);

  const subtopics = {};

  // Copy all existing subtopics (shallow-copy each entry's arrays/objects).
  for (const [name, sub] of Object.entries(prevSubtopics)) {
    subtopics[name] = {
      level: sub.level,
      attempts: sub.attempts,
      lastSeen: sub.lastSeen,
      history: [...sub.history],
    };
  }

  // Ensure the target subtopic exists.
  if (!subtopics[subtopicName]) {
    subtopics[subtopicName] = {
      level: 0,
      attempts: 0,
      lastSeen: null,
      history: [],
    };
  }

  const sub = subtopics[subtopicName];

  // 1. Append weighted score and truncate to last 5 entries.
  const newHistory = [...sub.history, weightedScoreValue].slice(-5);

  // 2. Recompute level.
  const newLevel = computeLevel(newHistory);

  // 3 & 4. Increment attempts, update lastSeen.
  const newAttempts = sub.attempts + 1;

  subtopics[subtopicName] = {
    level: newLevel,
    attempts: newAttempts,
    lastSeen: timestamp,
    history: newHistory,
  };

  // 5. Recompute aggregate.
  const aggregate = computeAggregate(subtopics);

  return { subtopics, aggregate };
}
