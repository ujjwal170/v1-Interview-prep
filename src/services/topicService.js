/**
 * CRUD helpers for topics and taxonomies.
 *
 * Topics:
 *   createTopic(name)          — case-insensitive dedupe via nameLower (Req 1.3)
 *   listTopicsByActivity()     — all topics sorted by lastActivityAt desc (Req 1.1)
 *   touchTopicActivity(id)     — update lastActivityAt to now (Req 1.2)
 *
 * Taxonomies:
 *   getTaxonomy(topicId)       — return taxonomy or null (Req 2.3)
 *   setTaxonomy(topicId, subtopics) — upsert full subtopic list (Req 2.3)
 *   addSubtopic(topicId, name) — add one subtopic, case-insensitive dedupe (Req 9.2)
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
// Topic helpers
// ---------------------------------------------------------------------------

/**
 * Create a new topic with the given name, or return the existing topic if one
 * with the same name (case-insensitive) already exists.
 *
 * @param {string} name - The display name for the topic.
 * @returns {Promise<Object>} The topic object (new or existing).
 */
export async function createTopic(name) {
  const trimmed = name.trim();
  const nameLower = trimmed.toLowerCase();

  // Case-insensitive dedupe: check for an existing topic with the same nameLower.
  const existing = await db.topics.where('nameLower').equals(nameLower).first();
  if (existing) {
    return existing;
  }

  const topic = {
    id: generateUUID(),
    name: trimmed,
    nameLower,
    lastActivityAt: Date.now(),
  };

  await db.topics.put(topic);
  return topic;
}

/**
 * Return all topics sorted by lastActivityAt descending (most recent first).
 *
 * @returns {Promise<Object[]>} Array of topic objects.
 */
export async function listTopicsByActivity() {
  const topics = await db.topics.orderBy('lastActivityAt').reverse().toArray();
  return topics;
}

/**
 * Update the lastActivityAt timestamp for the given topic to the current time.
 *
 * @param {string} id - The topic UUID.
 * @returns {Promise<void>}
 */
export async function touchTopicActivity(id) {
  await db.topics.update(id, { lastActivityAt: Date.now() });
}

/**
 * Get a topic by its UUID.
 *
 * @param {string} id - The topic UUID.
 * @returns {Promise<Object|null>} The topic object or null.
 */
export async function getTopic(id) {
  const topic = await db.topics.get(id);
  return topic ?? null;
}

// ---------------------------------------------------------------------------
// Taxonomy helpers
// ---------------------------------------------------------------------------

/**
 * Return the taxonomy record for the given topicId, or null if none exists.
 *
 * @param {string} topicId - The topic UUID.
 * @returns {Promise<Object|null>} The taxonomy object or null.
 */
export async function getTaxonomy(topicId) {
  const taxonomy = await db.taxonomies.get(topicId);
  return taxonomy ?? null;
}

/**
 * Create (or overwrite) the taxonomy record for the given topicId.
 *
 * Used exclusively during taxonomy bootstrap, when the topic has no existing
 * taxonomy. All subtopics start with attempts=0 and lastSeen=null.
 *
 * @param {string} topicId - The topic UUID.
 * @param {string[]} subtopics - Array of subtopic name strings.
 * @returns {Promise<Object>} The stored taxonomy object.
 */
export async function setTaxonomy(topicId, subtopics) {
  const taxonomy = {
    topicId,
    subtopics: subtopics.map((name) => ({
      name,
      attempts: 0,
      lastSeen: null,
    })),
  };

  await db.taxonomies.put(taxonomy);
  return taxonomy;
}

/**
 * Add a single subtopic to an existing taxonomy (creating the taxonomy if it
 * does not yet exist). Duplicate names are ignored (case-insensitive).
 *
 * @param {string} topicId - The topic UUID.
 * @param {string} name - The subtopic name to add.
 * @returns {Promise<Object>} The updated taxonomy object.
 */
export async function addSubtopic(topicId, name) {
  const existing = await db.taxonomies.get(topicId);
  const currentSubtopics = existing.subtopics;

  // Case-insensitive duplicate check.
  const nameLower = name.toLowerCase();
  const alreadyExists = currentSubtopics.some(
    (s) => s.name.toLowerCase() === nameLower
  );

  if (alreadyExists) {
    // Return the existing taxonomy unchanged.
    return existing;
  }

  const updatedSubtopics = [
    ...currentSubtopics,
    { name, attempts: 0, lastSeen: null },
  ];

  const taxonomy = {
    ...(existing ?? {}),
    topicId,
    subtopics: updatedSubtopics,
  };

  await db.taxonomies.put(taxonomy);
  return taxonomy;
}

/**
 * Persist the user's most recent subtopic selection for this topic.
 * Used by the SubtopicConfirmModal to pre-check the same items next session.
 *
 * @param {string} topicId
 * @param {string[]} selectedNames
 * @returns {Promise<void>}
 */
export async function setLastSelectedSubtopics(topicId, selectedNames) {
  const existing = await db.taxonomies.get(topicId);
  // No taxonomy yet — nothing to annotate. This guard prevents a
  // corrupt put (record without topicId / subtopics) if call order
  // ever changes.
  if (!existing) return;
  await db.taxonomies.put({ ...existing, lastSelected: selectedNames });
}
