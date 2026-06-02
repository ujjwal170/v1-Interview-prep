/**
 * Pure analytics computation functions for the Analytics page.
 *
 * All functions are side-effect-free and make no DB calls.
 * They operate on plain data objects passed in by the caller.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

/**
 * Get the last N completed sessions for a topic, sorted by startedAt desc.
 *
 * @param {Object[]} sessions - All completed sessions for the topic
 * @param {number} limit - Max sessions to return (default 10)
 * @returns {Object[]}
 */
export function getRecentSessions(sessions, limit = 10) {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  return sorted.slice(0, limit);
}

/**
 * Compute the line chart data: average score per session over the last N sessions.
 * Returns sorted oldest-first for chart display.
 *
 * @param {Object[]} sessions - Completed sessions sorted by startedAt desc
 * @returns {Array<{ date: string, score: number }>}
 */
export function computeScoreHistory(sessions) {
  // sessions are expected to be sorted desc (most recent first);
  // reverse to get oldest-first for chart display
  return [...sessions]
    .reverse()
    .map((session) => ({
      date: session.startedAt
        ? new Date(session.startedAt).toLocaleDateString()
        : '',
      score: session.averageScore ?? 0,
    }));
}

/**
 * Compute per-subtopic average scores from a skill profile.
 * Returns subtopics sorted weakest first (by level ascending).
 *
 * @param {{ subtopics: Object }} profile
 * @returns {Array<{ name: string, level: number, attempts: number }>}
 */
export function computeSubtopicLevels(profile) {
  if (!profile || typeof profile.subtopics !== 'object' || profile.subtopics === null) {
    return [];
  }

  const result = Object.entries(profile.subtopics).map(([name, data]) => ({
    name,
    level: data.level,
    attempts: data.attempts,
  }));

  // Sort weakest first (ascending by level)
  result.sort((a, b) => a.level - b.level);
  return result;
}

/**
 * Compute summary card values.
 *
 * @param {Object[]} sessions - All sessions for the topic (any status)
 * @param {{ subtopics: Object, aggregate: number }} profile
 * @returns {{ totalSessions: number, totalQuestions: number, aggregate: number }}
 */
export function computeSummaryCards(sessions, profile) {
  const totalSessions = sessions.length;

  const totalQuestions = sessions.reduce(
    (sum, session) => sum + session.questions.length,
    0
  );

  const aggregate = profile?.aggregate ?? 0;

  return { totalSessions, totalQuestions, aggregate };
}

/**
 * Group subtopics into strong (level >= 7), weak (level < 5, attempts > 0),
 * and unexplored (attempts === 0).
 *
 * @param {{ subtopics: Object }} profile
 * @returns {{ strong: string[], weak: string[], unexplored: string[] }}
 */
export function groupSubtopicsByStrength(profile) {
  const empty = { strong: [], weak: [], unexplored: [] };

  if (!profile || typeof profile.subtopics !== 'object' || profile.subtopics === null) {
    return empty;
  }

  const strong = [];
  const weak = [];
  const unexplored = [];

  for (const [name, data] of Object.entries(profile.subtopics)) {
    const level = data.level;
    const attempts = data.attempts;

    if (attempts === 0) {
      unexplored.push(name);
    } else if (level >= 7) {
      strong.push(name);
    } else if (level < 5) {
      weak.push(name);
    }
  }

  return { strong, weak, unexplored };
}
