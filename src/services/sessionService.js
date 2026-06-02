/**
 * CRUD helpers for sessions, skill profiles, and settings.
 *
 * Sessions:
 *   createSession({ topicId, difficultyIntent, targetLength, freeTextInstruction })
 *   appendQuestion(sessionId, q)
 *   setAnswer(sessionId, questionId, answer)
 *   setEvaluation(sessionId, questionId, evaluation)
 *   completeSession(sessionId, averageScore)
 *   listSessions()
 *   getSession(id)
 *   listCompletedSessionsForTopic(topicId, limit)
 *
 * Skill profiles:
 *   getSkillProfile(topicId)
 *   putSkillProfile(profile)
 *
 * Settings:
 *   getSetting(key)
 *   setSetting(key, value)
 *
 * Requirements: 5.1, 5.5, 10.1, 10.2, 10.4, 11.1, 11.2, 11.3, 12.2,
 *               16.1, 16.4
 */

import { db } from './db.js';

/**
 * Generate a UUID v4. Uses the Web Crypto API (`crypto.randomUUID`) when
 * available (browser and Node 19+), falling back to Node's built-in `crypto`
 * module so the service works in Jest/jsdom test environments too.
 *
 * @returns {string} A UUID v4 string.
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Node.js fallback (used in Jest/jsdom where globalThis.crypto may lack randomUUID).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').randomUUID();
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Create a new session record in the database.
 *
 * @param {{
 *   topicId: string,
 *   difficultyIntent: string,
 *   targetLength: number,
 *   freeTextInstruction: string,
 * }} config
 * @returns {Promise<Object>} The created session object.
 */
export async function createSession({
  topicId,
  difficultyIntent,
  targetLength,
  freeTextInstruction,
}) {
  const session = {
    id: generateUUID(),
    topicId,
    difficultyIntent,
    targetLength,
    freeTextInstruction,
    status: 'in_progress',
    startedAt: Date.now(),
    questions: [],
    averageScore: null,
  };

  await db.sessions.put(session);
  return session;
}

/**
 * Append a question object to the session's questions array.
 *
 * @param {string} sessionId
 * @param {Object} q - The question object to append.
 * @returns {Promise<void>}
 */
export async function appendQuestion(sessionId, q) {
  const session = await db.sessions.get(sessionId);
  const updated = { ...session, questions: [...session.questions, q] };
  await db.sessions.put(updated);
}

/**
 * Set the answer field on a specific question within a session.
 *
 * @param {string} sessionId
 * @param {string} questionId
 * @param {string} answer
 * @returns {Promise<void>}
 */
export async function setAnswer(sessionId, questionId, answer) {
  const session = await db.sessions.get(sessionId);
  const questions = session.questions.map((q) =>
    q.id === questionId ? { ...q, answer } : q
  );
  await db.sessions.put({ ...session, questions });
}

/**
 * Set the evaluation field on a specific question within a session.
 *
 * @param {string} sessionId
 * @param {string} questionId
 * @param {Object} evaluation - { score, strengths, gaps, modelAnswer }
 * @returns {Promise<void>}
 */
export async function setEvaluation(sessionId, questionId, evaluation) {
  const session = await db.sessions.get(sessionId);
  const questions = session.questions.map((q) =>
    q.id === questionId ? { ...q, evaluation } : q
  );
  await db.sessions.put({ ...session, questions });
}

/**
 * Mark a session as completed, persisting the final averageScore.
 *
 * @param {string} sessionId
 * @param {number|null} averageScore
 * @returns {Promise<void>}
 */
export async function completeSession(sessionId, averageScore) {
  const session = await db.sessions.get(sessionId);
  await db.sessions.put({
    ...session,
    status: 'completed',
    averageScore,
  });
}

/**
 * Return all sessions sorted by startedAt descending (most recent first).
 *
 * @returns {Promise<Object[]>}
 */
export async function listSessions() {
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray();
  return sessions;
}

/**
 * Return a single session by id, or null if not found.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getSession(id) {
  const session = await db.sessions.get(id);
  return session ?? null;
}

/**
 * Return completed sessions for a given topic, sorted by startedAt descending,
 * limited to `limit` results.
 *
 * @param {string} topicId
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
export async function listCompletedSessionsForTopic(topicId, limit) {
  const sessions = await db.sessions
    .where('topicId')
    .equals(topicId)
    .filter((s) => s.status === 'completed')
    .toArray();

  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return sessions.slice(0, limit);
}

/**
 * Delete a session record from the database.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  await db.sessions.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Skill profile helpers
// ---------------------------------------------------------------------------

/**
 * Return the skill profile for the given topicId, or null if none exists.
 *
 * @param {string} topicId
 * @returns {Promise<Object|null>}
 */
export async function getSkillProfile(topicId) {
  const profile = await db.skillProfiles.get(topicId);
  return profile ?? null;
}

/**
 * Upsert a skill profile. The profile must include a `topicId` field.
 *
 * @param {Object} profile - Must include a `topicId` field.
 * @returns {Promise<void>}
 */
export async function putSkillProfile(profile) {
  await db.skillProfiles.put(profile);
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

/**
 * Return the value for the given settings key, or null if not set.
 *
 * @param {string} key
 * @returns {Promise<*>}
 */
export async function getSetting(key) {
  const record = await db.settings.get(key);
  return record?.value ?? null;
}

/**
 * Upsert a settings value for the given key.
 *
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}
