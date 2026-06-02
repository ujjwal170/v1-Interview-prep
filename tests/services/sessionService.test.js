/**
 * Tests for src/services/sessionService.js
 * Uses fake-indexeddb so no real browser IndexedDB is needed.
 *
 * Covers task 6.3: CRUD helpers for sessions, drafts, skill profiles, settings.
 * Requirements: 5.2, 5.3, 5.4, 10.1, 10.2, 10.4, 11.1, 11.2, 11.3, 12.2,
 *               16.1, 16.4
 */
import 'fake-indexeddb/auto';
import { db } from '../../src/services/db.js';
import {
  createSession,
  appendQuestion,
  setAnswer,
  setEvaluation,
  completeSession,
  listSessions,
  getSession,
  listCompletedSessionsForTopic,
  isInProgress,
  persistDraft,
  getDraft,
  clearDraft,
  getSkillProfile,
  putSkillProfile,
  getSetting,
  setSetting,
} from '../../src/services/sessionService.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clearAll() {
  await db.sessions.clear();
  await db.drafts.clear();
  await db.skillProfiles.clear();
  await db.settings.clear();
}

function makeSessionConfig(overrides = {}) {
  return {
    topicId: 'topic-1',
    difficultyIntent: 'adaptive',
    targetLength: 5,
    freeTextInstruction: '',
    ...overrides,
  };
}

function makeQuestion(id = 'q-1') {
  return {
    id,
    text: 'What is a closure?',
    subtopic: 'closures',
    difficulty: 5,
    generatedAt: Date.now(),
    answer: null,
    evaluation: null,
  };
}

// ---------------------------------------------------------------------------
// createSession()
// ---------------------------------------------------------------------------

describe('createSession()', () => {
  beforeEach(clearAll);

  it('creates a session with the correct shape', async () => {
    const session = await createSession(makeSessionConfig());
    expect(session).toMatchObject({
      topicId: 'topic-1',
      difficultyIntent: 'adaptive',
      targetLength: 5,
      freeTextInstruction: '',
      status: 'in_progress',
      completedAt: null,
      questions: [],
      averageScore: null,
    });
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
    expect(typeof session.startedAt).toBe('number');
  });

  it('persists the session to the database', async () => {
    const session = await createSession(makeSessionConfig());
    const stored = await db.sessions.get(session.id);
    expect(stored).toMatchObject({ id: session.id, status: 'in_progress' });
  });

  it('generates a unique id for each session', async () => {
    const a = await createSession(makeSessionConfig());
    const b = await createSession(makeSessionConfig());
    expect(a.id).not.toBe(b.id);
  });

  it('defaults freeTextInstruction to empty string when not provided', async () => {
    const session = await createSession({
      topicId: 'topic-1',
      difficultyIntent: 'easy',
      targetLength: 5,
    });
    expect(session.freeTextInstruction).toBe('');
  });

  it('sets startedAt to a recent timestamp', async () => {
    const before = Date.now();
    const session = await createSession(makeSessionConfig());
    expect(session.startedAt).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// appendQuestion()
// ---------------------------------------------------------------------------

describe('appendQuestion()', () => {
  beforeEach(clearAll);

  it('appends a question to the session questions array', async () => {
    const session = await createSession(makeSessionConfig());
    const q = makeQuestion('q-1');
    await appendQuestion(session.id, q);

    const stored = await db.sessions.get(session.id);
    expect(stored.questions).toHaveLength(1);
    expect(stored.questions[0]).toMatchObject({ id: 'q-1', text: 'What is a closure?' });
  });

  it('appends multiple questions in order', async () => {
    const session = await createSession(makeSessionConfig());
    await appendQuestion(session.id, makeQuestion('q-1'));
    await appendQuestion(session.id, makeQuestion('q-2'));
    await appendQuestion(session.id, makeQuestion('q-3'));

    const stored = await db.sessions.get(session.id);
    expect(stored.questions).toHaveLength(3);
    expect(stored.questions.map((q) => q.id)).toEqual(['q-1', 'q-2', 'q-3']);
  });

  it('does nothing when sessionId does not exist', async () => {
    await expect(appendQuestion('nonexistent', makeQuestion())).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setAnswer()
// ---------------------------------------------------------------------------

describe('setAnswer()', () => {
  beforeEach(clearAll);

  it('sets the answer on the matching question', async () => {
    const session = await createSession(makeSessionConfig());
    await appendQuestion(session.id, makeQuestion('q-1'));

    await setAnswer(session.id, 'q-1', 'A closure captures its lexical scope.');

    const stored = await db.sessions.get(session.id);
    expect(stored.questions[0].answer).toBe('A closure captures its lexical scope.');
  });

  it('does not affect other questions', async () => {
    const session = await createSession(makeSessionConfig());
    await appendQuestion(session.id, makeQuestion('q-1'));
    await appendQuestion(session.id, makeQuestion('q-2'));

    await setAnswer(session.id, 'q-1', 'Answer for q1');

    const stored = await db.sessions.get(session.id);
    expect(stored.questions[0].answer).toBe('Answer for q1');
    expect(stored.questions[1].answer).toBeNull();
  });

  it('does nothing when sessionId does not exist', async () => {
    await expect(setAnswer('nonexistent', 'q-1', 'text')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setEvaluation()
// ---------------------------------------------------------------------------

describe('setEvaluation()', () => {
  beforeEach(clearAll);

  it('sets the evaluation on the matching question', async () => {
    const session = await createSession(makeSessionConfig());
    await appendQuestion(session.id, makeQuestion('q-1'));

    const evaluation = { score: 8, strengths: 'Good', gaps: 'None', modelAnswer: 'Perfect' };
    await setEvaluation(session.id, 'q-1', evaluation);

    const stored = await db.sessions.get(session.id);
    expect(stored.questions[0].evaluation).toMatchObject(evaluation);
  });

  it('does not affect other questions', async () => {
    const session = await createSession(makeSessionConfig());
    await appendQuestion(session.id, makeQuestion('q-1'));
    await appendQuestion(session.id, makeQuestion('q-2'));

    const evaluation = { score: 7, strengths: 'Good', gaps: 'Minor', modelAnswer: 'Model' };
    await setEvaluation(session.id, 'q-1', evaluation);

    const stored = await db.sessions.get(session.id);
    expect(stored.questions[0].evaluation).toMatchObject(evaluation);
    expect(stored.questions[1].evaluation).toBeNull();
  });

  it('does nothing when sessionId does not exist', async () => {
    await expect(setEvaluation('nonexistent', 'q-1', {})).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// completeSession()
// ---------------------------------------------------------------------------

describe('completeSession()', () => {
  beforeEach(clearAll);

  it('sets status to completed, completedAt, and averageScore', async () => {
    const session = await createSession(makeSessionConfig());
    const ts = Date.now();
    await completeSession(session.id, ts, 7.5);

    const stored = await db.sessions.get(session.id);
    expect(stored.status).toBe('completed');
    expect(stored.completedAt).toBe(ts);
    expect(stored.averageScore).toBe(7.5);
  });

  it('accepts null averageScore', async () => {
    const session = await createSession(makeSessionConfig());
    await completeSession(session.id, Date.now(), null);

    const stored = await db.sessions.get(session.id);
    expect(stored.status).toBe('completed');
    expect(stored.averageScore).toBeNull();
  });

  it('does nothing when sessionId does not exist', async () => {
    await expect(completeSession('nonexistent', Date.now(), 5)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// listSessions()
// ---------------------------------------------------------------------------

describe('listSessions()', () => {
  beforeEach(clearAll);

  it('returns an empty array when no sessions exist', async () => {
    const result = await listSessions();
    expect(result).toEqual([]);
  });

  it('returns sessions sorted by startedAt descending (Req 11.1)', async () => {
    await db.sessions.put({ id: 'a', topicId: 't1', status: 'completed', startedAt: 1000, completedAt: 2000, questions: [], averageScore: 5 });
    await db.sessions.put({ id: 'b', topicId: 't1', status: 'in_progress', startedAt: 3000, completedAt: null, questions: [], averageScore: null });
    await db.sessions.put({ id: 'c', topicId: 't1', status: 'completed', startedAt: 2000, completedAt: 3000, questions: [], averageScore: 6 });

    const result = await listSessions();
    expect(result.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns all sessions regardless of status', async () => {
    await createSession(makeSessionConfig({ topicId: 't1' }));
    await createSession(makeSessionConfig({ topicId: 't2' }));
    const result = await listSessions();
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getSession()
// ---------------------------------------------------------------------------

describe('getSession()', () => {
  beforeEach(clearAll);

  it('returns the session when it exists', async () => {
    const session = await createSession(makeSessionConfig());
    const result = await getSession(session.id);
    expect(result).toMatchObject({ id: session.id, status: 'in_progress' });
  });

  it('returns null when the session does not exist', async () => {
    const result = await getSession('nonexistent');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listCompletedSessionsForTopic()
// ---------------------------------------------------------------------------

describe('listCompletedSessionsForTopic()', () => {
  beforeEach(clearAll);

  it('returns only completed sessions for the given topic', async () => {
    const s1 = await createSession(makeSessionConfig({ topicId: 'topic-1' }));
    const s2 = await createSession(makeSessionConfig({ topicId: 'topic-1' }));
    const s3 = await createSession(makeSessionConfig({ topicId: 'topic-2' }));

    await completeSession(s1.id, Date.now(), 7);
    await completeSession(s3.id, Date.now(), 8);
    // s2 remains in_progress

    const result = await listCompletedSessionsForTopic('topic-1', 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(s1.id);
  });

  it('returns sessions sorted by startedAt descending (Req 12.2)', async () => {
    // Insert sessions with controlled startedAt values.
    await db.sessions.put({ id: 'x1', topicId: 'topic-1', status: 'completed', startedAt: 1000, completedAt: 2000, questions: [], averageScore: 5 });
    await db.sessions.put({ id: 'x2', topicId: 'topic-1', status: 'completed', startedAt: 3000, completedAt: 4000, questions: [], averageScore: 6 });
    await db.sessions.put({ id: 'x3', topicId: 'topic-1', status: 'completed', startedAt: 2000, completedAt: 3000, questions: [], averageScore: 7 });

    const result = await listCompletedSessionsForTopic('topic-1', 10);
    expect(result.map((s) => s.id)).toEqual(['x2', 'x3', 'x1']);
  });

  it('respects the limit parameter', async () => {
    for (let i = 0; i < 5; i++) {
      const s = await createSession(makeSessionConfig({ topicId: 'topic-1' }));
      await completeSession(s.id, Date.now() + i, 5);
    }

    const result = await listCompletedSessionsForTopic('topic-1', 3);
    expect(result).toHaveLength(3);
  });

  it('returns an empty array when no completed sessions exist for the topic', async () => {
    await createSession(makeSessionConfig({ topicId: 'topic-1' }));
    const result = await listCompletedSessionsForTopic('topic-1', 10);
    expect(result).toEqual([]);
  });

  it('does not include sessions from other topics', async () => {
    const s = await createSession(makeSessionConfig({ topicId: 'topic-2' }));
    await completeSession(s.id, Date.now(), 6);

    const result = await listCompletedSessionsForTopic('topic-1', 10);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isInProgress()
// ---------------------------------------------------------------------------

describe('isInProgress()', () => {
  it('returns true for a session with status in_progress (Req 11.3)', () => {
    expect(isInProgress({ status: 'in_progress' })).toBe(true);
  });

  it('returns false for a completed session', () => {
    expect(isInProgress({ status: 'completed' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isInProgress(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isInProgress(undefined)).toBe(false);
  });

  it('returns false for an object with no status', () => {
    expect(isInProgress({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------

describe('persistDraft() / getDraft() / clearDraft()', () => {
  beforeEach(clearAll);

  it('persists and retrieves a draft (Req 5.2, 5.3)', async () => {
    await persistDraft('session-1', 'q-1', 'My draft answer');
    const text = await getDraft('session-1', 'q-1');
    expect(text).toBe('My draft answer');
  });

  it('returns null when no draft exists', async () => {
    const text = await getDraft('session-1', 'q-nonexistent');
    expect(text).toBeNull();
  });

  it('overwrites an existing draft on re-persist (upsert)', async () => {
    await persistDraft('session-1', 'q-1', 'First draft');
    await persistDraft('session-1', 'q-1', 'Updated draft');
    const text = await getDraft('session-1', 'q-1');
    expect(text).toBe('Updated draft');
  });

  it('clears a draft (Req 5.4)', async () => {
    await persistDraft('session-1', 'q-1', 'Some text');
    await clearDraft('session-1', 'q-1');
    const text = await getDraft('session-1', 'q-1');
    expect(text).toBeNull();
  });

  it('clearDraft does nothing when draft does not exist', async () => {
    await expect(clearDraft('session-1', 'q-nonexistent')).resolves.toBeUndefined();
  });

  it('drafts are keyed by (sessionId, questionId) — different questions are independent', async () => {
    await persistDraft('session-1', 'q-1', 'Draft for q1');
    await persistDraft('session-1', 'q-2', 'Draft for q2');

    expect(await getDraft('session-1', 'q-1')).toBe('Draft for q1');
    expect(await getDraft('session-1', 'q-2')).toBe('Draft for q2');
  });

  it('drafts are keyed by (sessionId, questionId) — different sessions are independent', async () => {
    await persistDraft('session-1', 'q-1', 'Session 1 draft');
    await persistDraft('session-2', 'q-1', 'Session 2 draft');

    expect(await getDraft('session-1', 'q-1')).toBe('Session 1 draft');
    expect(await getDraft('session-2', 'q-1')).toBe('Session 2 draft');
  });

  it('persists updatedAt timestamp', async () => {
    const before = Date.now();
    await persistDraft('session-1', 'q-1', 'text');
    const record = await db.drafts.get(['session-1', 'q-1']);
    expect(record.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('preserves unicode text in drafts', async () => {
    const unicode = '日本語テスト 🎉 \u0000 \uFFFF';
    await persistDraft('session-1', 'q-1', unicode);
    const text = await getDraft('session-1', 'q-1');
    expect(text).toBe(unicode);
  });
});

// ---------------------------------------------------------------------------
// Skill profile helpers
// ---------------------------------------------------------------------------

describe('getSkillProfile() / putSkillProfile()', () => {
  beforeEach(clearAll);

  it('returns null when no profile exists', async () => {
    const result = await getSkillProfile('topic-1');
    expect(result).toBeNull();
  });

  it('persists and retrieves a skill profile', async () => {
    const profile = {
      topicId: 'topic-1',
      subtopics: { closures: { level: 7, attempts: 3, lastSeen: 1000, history: [6, 7, 8] } },
      aggregate: 7,
    };
    await putSkillProfile(profile);
    const result = await getSkillProfile('topic-1');
    expect(result).toMatchObject({
      topicId: 'topic-1',
      aggregate: 7,
    });
    expect(result.subtopics.closures).toMatchObject({ level: 7, attempts: 3 });
  });

  it('upserts an existing profile', async () => {
    const profile = { topicId: 'topic-1', subtopics: {}, aggregate: 0 };
    await putSkillProfile(profile);
    await putSkillProfile({ ...profile, aggregate: 5 });

    const result = await getSkillProfile('topic-1');
    expect(result.aggregate).toBe(5);
  });

  it('sets updatedAt to a recent timestamp', async () => {
    const before = Date.now();
    await putSkillProfile({ topicId: 'topic-1', subtopics: {}, aggregate: 0 });
    const result = await getSkillProfile('topic-1');
    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('does not mutate the input profile object', async () => {
    const profile = { topicId: 'topic-1', subtopics: {}, aggregate: 0 };
    await putSkillProfile(profile);
    expect(profile.updatedAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

describe('getSetting() / setSetting()', () => {
  beforeEach(clearAll);

  it('returns null when the key does not exist', async () => {
    const result = await getSetting('apiKey');
    expect(result).toBeNull();
  });

  it('persists and retrieves a string setting', async () => {
    await setSetting('apiKey', 'my-secret-key');
    const result = await getSetting('apiKey');
    expect(result).toBe('my-secret-key');
  });

  it('persists and retrieves a boolean setting', async () => {
    await setSetting('useMock', true);
    const result = await getSetting('useMock');
    expect(result).toBe(true);
  });

  it('persists and retrieves a numeric setting', async () => {
    await setSetting('defaultDifficulty', 5);
    const result = await getSetting('defaultDifficulty');
    expect(result).toBe(5);
  });

  it('upserts an existing setting', async () => {
    await setSetting('apiKey', 'old-key');
    await setSetting('apiKey', 'new-key');
    const result = await getSetting('apiKey');
    expect(result).toBe('new-key');
  });

  it('different keys are independent', async () => {
    await setSetting('apiKey', 'key-value');
    await setSetting('useMock', false);

    expect(await getSetting('apiKey')).toBe('key-value');
    expect(await getSetting('useMock')).toBe(false);
  });
});
