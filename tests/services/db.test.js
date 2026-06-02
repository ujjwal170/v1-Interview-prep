/**
 * Tests for src/services/db.js
 * Uses fake-indexeddb so no real browser IndexedDB is needed.
 */
import 'fake-indexeddb/auto';
import { db, openDB } from '../../src/services/db.js';

describe('Dexie schema and singleton (task 6.1)', () => {
  afterAll(async () => {
    // Close the db after all tests to avoid open-handle warnings.
    if (db.isOpen()) {
      db.close();
    }
  });

  describe('db singleton', () => {
    it('is a Dexie instance named "iprep"', () => {
      expect(db).toBeDefined();
      expect(db.name).toBe('iprep');
    });

    it('exposes all six expected table accessors', () => {
      expect(db.topics).toBeDefined();
      expect(db.taxonomies).toBeDefined();
      expect(db.sessions).toBeDefined();
      expect(db.skillProfiles).toBeDefined();
      expect(db.drafts).toBeDefined();
      expect(db.settings).toBeDefined();
    });
  });

  describe('openDB()', () => {
    it('resolves with the db instance when IndexedDB is available', async () => {
      const result = await openDB();
      expect(result).toBe(db);
      expect(db.isOpen()).toBe(true);
    });

    it('returns the same singleton on repeated calls', async () => {
      const a = await openDB();
      const b = await openDB();
      expect(a).toBe(b);
    });
  });

  describe('schema — topics table', () => {
    beforeEach(async () => {
      await openDB();
      await db.topics.clear();
    });

    it('stores and retrieves a topic by id', async () => {
      const topic = {
        id: 'topic-1',
        name: 'React',
        nameLower: 'react',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      await db.topics.put(topic);
      const found = await db.topics.get('topic-1');
      expect(found).toMatchObject({ id: 'topic-1', name: 'React' });
    });

    it('enforces unique nameLower index', async () => {
      const base = {
        name: 'React',
        nameLower: 'react',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      await db.topics.put({ id: 'topic-a', ...base });
      // Putting a second record with the same nameLower should throw a
      // ConstraintError because &nameLower is a unique index.
      await expect(
        db.topics.put({ id: 'topic-b', ...base })
      ).rejects.toBeDefined();
    });
  });

  describe('schema — taxonomies table', () => {
    beforeEach(async () => {
      await openDB();
      await db.taxonomies.clear();
    });

    it('stores and retrieves a taxonomy by topicId', async () => {
      const taxonomy = {
        topicId: 'topic-1',
        subtopics: [{ name: 'hooks', attempts: 0, lastSeen: null }],
        updatedAt: Date.now(),
      };
      await db.taxonomies.put(taxonomy);
      const found = await db.taxonomies.get('topic-1');
      expect(found).toMatchObject({ topicId: 'topic-1' });
      expect(found.subtopics).toHaveLength(1);
    });
  });

  describe('schema — sessions table', () => {
    beforeEach(async () => {
      await openDB();
      await db.sessions.clear();
    });

    it('stores and retrieves a session by id', async () => {
      const session = {
        id: 'session-1',
        topicId: 'topic-1',
        difficultyIntent: 'adaptive',
        targetLength: 10,
        freeTextInstruction: '',
        status: 'in_progress',
        startedAt: Date.now(),
        completedAt: null,
        questions: [],
        averageScore: null,
      };
      await db.sessions.put(session);
      const found = await db.sessions.get('session-1');
      expect(found).toMatchObject({ id: 'session-1', status: 'in_progress' });
    });

    it('can query sessions by topicId index', async () => {
      await db.sessions.put({
        id: 's1', topicId: 'topic-A', status: 'in_progress',
        startedAt: 1000, completedAt: null, questions: [],
      });
      await db.sessions.put({
        id: 's2', topicId: 'topic-B', status: 'completed',
        startedAt: 2000, completedAt: 3000, questions: [],
      });
      const topicASessions = await db.sessions.where('topicId').equals('topic-A').toArray();
      expect(topicASessions).toHaveLength(1);
      expect(topicASessions[0].id).toBe('s1');
    });
  });

  describe('schema — skillProfiles table', () => {
    beforeEach(async () => {
      await openDB();
      await db.skillProfiles.clear();
    });

    it('stores and retrieves a skill profile by topicId', async () => {
      const profile = {
        topicId: 'topic-1',
        subtopics: {},
        aggregate: 0,
        updatedAt: Date.now(),
      };
      await db.skillProfiles.put(profile);
      const found = await db.skillProfiles.get('topic-1');
      expect(found).toMatchObject({ topicId: 'topic-1', aggregate: 0 });
    });
  });

  describe('schema — drafts table (compound key)', () => {
    beforeEach(async () => {
      await openDB();
      await db.drafts.clear();
    });

    it('stores and retrieves a draft by compound [sessionId+questionId] key', async () => {
      const draft = {
        sessionId: 'session-1',
        questionId: 'q-1',
        text: 'My draft answer',
        updatedAt: Date.now(),
      };
      await db.drafts.put(draft);
      const found = await db.drafts.get(['session-1', 'q-1']);
      expect(found).toMatchObject({ text: 'My draft answer' });
    });

    it('allows different questions in the same session', async () => {
      await db.drafts.put({ sessionId: 's1', questionId: 'q1', text: 'draft 1', updatedAt: 1 });
      await db.drafts.put({ sessionId: 's1', questionId: 'q2', text: 'draft 2', updatedAt: 2 });
      const d1 = await db.drafts.get(['s1', 'q1']);
      const d2 = await db.drafts.get(['s1', 'q2']);
      expect(d1.text).toBe('draft 1');
      expect(d2.text).toBe('draft 2');
    });
  });

  describe('schema — settings table', () => {
    beforeEach(async () => {
      await openDB();
      await db.settings.clear();
    });

    it('stores and retrieves a setting by key', async () => {
      await db.settings.put({ key: 'apiKey', value: 'test-key-123' });
      const found = await db.settings.get('apiKey');
      expect(found).toMatchObject({ key: 'apiKey', value: 'test-key-123' });
    });

    it('overwrites an existing setting on put', async () => {
      await db.settings.put({ key: 'apiKey', value: 'old-key' });
      await db.settings.put({ key: 'apiKey', value: 'new-key' });
      const found = await db.settings.get('apiKey');
      expect(found.value).toBe('new-key');
    });
  });
});
