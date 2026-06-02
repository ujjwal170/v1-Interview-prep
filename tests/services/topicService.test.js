/**
 * Tests for src/services/topicService.js
 * Uses fake-indexeddb so no real browser IndexedDB is needed.
 *
 * Covers task 6.2: CRUD helpers for topics and taxonomies.
 * Requirements: 1.1, 1.2, 1.3, 2.3, 9.2
 */
import 'fake-indexeddb/auto';
import { db } from '../../src/services/db.js';
import {
  createTopic,
  listTopicsByActivity,
  touchTopicActivity,
  getTaxonomy,
  setTaxonomy,
  addSubtopic,
} from '../../src/services/topicService.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clearAll() {
  await db.topics.clear();
  await db.taxonomies.clear();
}

// ---------------------------------------------------------------------------
// Topic helpers
// ---------------------------------------------------------------------------

describe('createTopic()', () => {
  beforeEach(clearAll);

  it('creates a new topic and returns it', async () => {
    const topic = await createTopic('React');
    expect(topic).toMatchObject({
      name: 'React',
      nameLower: 'react',
    });
    expect(typeof topic.id).toBe('string');
    expect(topic.id.length).toBeGreaterThan(0);
    expect(typeof topic.createdAt).toBe('number');
    expect(typeof topic.lastActivityAt).toBe('number');
  });

  it('persists the topic to the database', async () => {
    const topic = await createTopic('System Design');
    const stored = await db.topics.get(topic.id);
    expect(stored).toMatchObject({ name: 'System Design', nameLower: 'system design' });
  });

  it('trims whitespace from the name', async () => {
    const topic = await createTopic('  React  ');
    expect(topic.name).toBe('React');
    expect(topic.nameLower).toBe('react');
  });

  it('returns the existing topic on case-insensitive duplicate (Req 1.3)', async () => {
    const first = await createTopic('React');
    const second = await createTopic('react');
    expect(second.id).toBe(first.id);
    expect(second.name).toBe(first.name);
  });

  it('returns the existing topic on mixed-case duplicate (Req 1.3)', async () => {
    const first = await createTopic('System Design');
    const second = await createTopic('SYSTEM DESIGN');
    expect(second.id).toBe(first.id);
  });

  it('does NOT create a duplicate record in the database', async () => {
    await createTopic('React');
    await createTopic('REACT');
    const all = await db.topics.toArray();
    expect(all).toHaveLength(1);
  });

  it('creates distinct topics for different names', async () => {
    const a = await createTopic('React');
    const b = await createTopic('Vue');
    expect(a.id).not.toBe(b.id);
    const all = await db.topics.toArray();
    expect(all).toHaveLength(2);
  });

  it('generates a unique UUID for each new topic', async () => {
    const a = await createTopic('React');
    const b = await createTopic('Vue');
    expect(a.id).not.toBe(b.id);
  });
});

describe('listTopicsByActivity()', () => {
  beforeEach(clearAll);

  it('returns an empty array when no topics exist', async () => {
    const result = await listTopicsByActivity();
    expect(result).toEqual([]);
  });

  it('returns topics sorted by lastActivityAt descending (Req 1.1)', async () => {
    await db.topics.put({ id: 'a', name: 'A', nameLower: 'a', createdAt: 1000, lastActivityAt: 1000 });
    await db.topics.put({ id: 'b', name: 'B', nameLower: 'b', createdAt: 2000, lastActivityAt: 3000 });
    await db.topics.put({ id: 'c', name: 'C', nameLower: 'c', createdAt: 3000, lastActivityAt: 2000 });

    const result = await listTopicsByActivity();
    expect(result.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns all topics', async () => {
    await createTopic('React');
    await createTopic('Vue');
    await createTopic('Angular');
    const result = await listTopicsByActivity();
    expect(result).toHaveLength(3);
  });
});

describe('touchTopicActivity()', () => {
  beforeEach(clearAll);

  it('updates lastActivityAt to a recent timestamp (Req 1.2)', async () => {
    const before = Date.now();
    const topic = await createTopic('React');
    // Manually set an old timestamp so we can verify the update.
    await db.topics.update(topic.id, { lastActivityAt: 1000 });

    await touchTopicActivity(topic.id);

    const updated = await db.topics.get(topic.id);
    expect(updated.lastActivityAt).toBeGreaterThanOrEqual(before);
  });

  it('does not affect other fields', async () => {
    const topic = await createTopic('React');
    await touchTopicActivity(topic.id);
    const updated = await db.topics.get(topic.id);
    expect(updated.name).toBe('React');
    expect(updated.nameLower).toBe('react');
    expect(updated.id).toBe(topic.id);
  });
});

// ---------------------------------------------------------------------------
// Taxonomy helpers
// ---------------------------------------------------------------------------

describe('getTaxonomy()', () => {
  beforeEach(clearAll);

  it('returns null when no taxonomy exists for the topicId', async () => {
    const result = await getTaxonomy('nonexistent-topic');
    expect(result).toBeNull();
  });

  it('returns the taxonomy when it exists', async () => {
    await db.taxonomies.put({
      topicId: 'topic-1',
      subtopics: [{ name: 'hooks', attempts: 0, lastSeen: null }],
      updatedAt: Date.now(),
    });
    const result = await getTaxonomy('topic-1');
    expect(result).toMatchObject({ topicId: 'topic-1' });
    expect(result.subtopics).toHaveLength(1);
  });
});

describe('setTaxonomy()', () => {
  beforeEach(clearAll);

  it('creates a new taxonomy with the given subtopics', async () => {
    const taxonomy = await setTaxonomy('topic-1', ['hooks', 'state', 'context']);
    expect(taxonomy.topicId).toBe('topic-1');
    expect(taxonomy.subtopics).toHaveLength(3);
    expect(taxonomy.subtopics[0]).toMatchObject({ name: 'hooks', attempts: 0, lastSeen: null });
  });

  it('persists the taxonomy to the database', async () => {
    await setTaxonomy('topic-1', ['hooks']);
    const stored = await db.taxonomies.get('topic-1');
    expect(stored).toBeDefined();
    expect(stored.subtopics[0].name).toBe('hooks');
  });

  it('sets updatedAt to a recent timestamp', async () => {
    const before = Date.now();
    const taxonomy = await setTaxonomy('topic-1', ['hooks']);
    expect(taxonomy.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('preserves existing attempts and lastSeen for matching subtopics (Req 2.3)', async () => {
    // Seed an existing taxonomy with tracked data.
    await db.taxonomies.put({
      topicId: 'topic-1',
      subtopics: [
        { name: 'hooks', attempts: 5, lastSeen: 9999 },
        { name: 'state', attempts: 2, lastSeen: 8888 },
      ],
      updatedAt: 1000,
    });

    // Re-set taxonomy with the same subtopics.
    const updated = await setTaxonomy('topic-1', ['hooks', 'state', 'context']);

    const hooks = updated.subtopics.find((s) => s.name === 'hooks');
    const state = updated.subtopics.find((s) => s.name === 'state');
    const context = updated.subtopics.find((s) => s.name === 'context');

    expect(hooks).toMatchObject({ attempts: 5, lastSeen: 9999 });
    expect(state).toMatchObject({ attempts: 2, lastSeen: 8888 });
    expect(context).toMatchObject({ attempts: 0, lastSeen: null });
  });

  it('preserves attempts/lastSeen case-insensitively', async () => {
    await db.taxonomies.put({
      topicId: 'topic-1',
      subtopics: [{ name: 'Hooks', attempts: 3, lastSeen: 7777 }],
      updatedAt: 1000,
    });

    // Pass lowercase version — should still match and preserve data.
    const updated = await setTaxonomy('topic-1', ['hooks']);
    const hooks = updated.subtopics.find((s) => s.name === 'hooks');
    expect(hooks).toMatchObject({ attempts: 3, lastSeen: 7777 });
  });

  it('replaces the taxonomy when called again (upsert)', async () => {
    await setTaxonomy('topic-1', ['hooks', 'state']);
    const updated = await setTaxonomy('topic-1', ['context', 'performance']);
    expect(updated.subtopics).toHaveLength(2);
    expect(updated.subtopics.map((s) => s.name)).toEqual(['context', 'performance']);
  });
});

describe('addSubtopic()', () => {
  beforeEach(clearAll);

  it('creates a taxonomy if none exists and adds the subtopic', async () => {
    const taxonomy = await addSubtopic('topic-1', 'hooks');
    expect(taxonomy.topicId).toBe('topic-1');
    expect(taxonomy.subtopics).toHaveLength(1);
    expect(taxonomy.subtopics[0]).toMatchObject({ name: 'hooks', attempts: 0, lastSeen: null });
  });

  it('appends a subtopic to an existing taxonomy', async () => {
    await setTaxonomy('topic-1', ['hooks', 'state']);
    const updated = await addSubtopic('topic-1', 'context');
    expect(updated.subtopics).toHaveLength(3);
    expect(updated.subtopics.map((s) => s.name)).toContain('context');
  });

  it('ignores duplicate subtopic names (case-insensitive) (Req 9.2)', async () => {
    await setTaxonomy('topic-1', ['hooks']);
    const updated = await addSubtopic('topic-1', 'HOOKS');
    expect(updated.subtopics).toHaveLength(1);
  });

  it('ignores exact-case duplicate subtopic names', async () => {
    await setTaxonomy('topic-1', ['hooks']);
    const updated = await addSubtopic('topic-1', 'hooks');
    expect(updated.subtopics).toHaveLength(1);
  });

  it('persists the updated taxonomy to the database', async () => {
    await addSubtopic('topic-1', 'hooks');
    const stored = await db.taxonomies.get('topic-1');
    expect(stored.subtopics).toHaveLength(1);
    expect(stored.subtopics[0].name).toBe('hooks');
  });

  it('preserves existing attempts/lastSeen when adding a new subtopic', async () => {
    await db.taxonomies.put({
      topicId: 'topic-1',
      subtopics: [{ name: 'hooks', attempts: 4, lastSeen: 5555 }],
      updatedAt: 1000,
    });
    const updated = await addSubtopic('topic-1', 'state');
    const hooks = updated.subtopics.find((s) => s.name === 'hooks');
    expect(hooks).toMatchObject({ attempts: 4, lastSeen: 5555 });
  });

  it('returns the existing taxonomy unchanged when duplicate is added', async () => {
    await setTaxonomy('topic-1', ['hooks']);
    const before = await getTaxonomy('topic-1');
    const result = await addSubtopic('topic-1', 'hooks');
    expect(result.subtopics).toHaveLength(1);
    expect(result.updatedAt).toBe(before.updatedAt);
  });
});
