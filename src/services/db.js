import Dexie from 'dexie';

/**
 * Singleton Dexie database instance for I-Prep.
 * Database name: 'iprep'
 */
export const db = new Dexie('iprep');

db.version(1).stores({
  topics:        '&id, &nameLower, lastActivityAt',
  taxonomies:    '&topicId',
  sessions:      '&id, topicId, status, startedAt',
  skillProfiles: '&topicId',
  settings:      '&key',
});

/**
 * @typedef {Object} IndexedDBUnavailableError
 * @property {'IndexedDBUnavailable'} type
 * @property {string} message
 * @property {unknown} [cause]
 */

/**
 * Opens the Dexie database, wrapping any failure in a typed error object.
 *
 * Callers (e.g. the App-level gate and the `useIndexedDB` hook) should call
 * this function on startup and treat a rejection as a fatal, unrecoverable
 * condition that requires showing the IndexedDB-unavailable error page
 * (Requirement 16.3).
 *
 * @returns {Promise<typeof db>} Resolves with the open db instance.
 * @throws {IndexedDBUnavailableError} Rejects with a typed error when
 *   IndexedDB is unavailable or the database cannot be opened.
 */
export async function openDB() {
  // Guard: IndexedDB may be absent in certain environments (e.g. private
  // browsing on some browsers, or non-browser JS runtimes).
  if (typeof indexedDB === 'undefined' || indexedDB === null) {
    return Promise.reject({
      type: 'IndexedDBUnavailable',
      message:
        'IndexedDB is not available in this browser. ' +
        'I-Prep requires IndexedDB to store your data locally.',
    });
  }

  try {
    await db.open();
    return db;
  } catch (cause) {
    return Promise.reject(
      /** @type {IndexedDBUnavailableError} */ ({
        type: 'IndexedDBUnavailable',
        message:
          'Failed to open the local database. ' +
          'I-Prep requires IndexedDB support. ' +
          (cause instanceof Error ? cause.message : String(cause)),
        cause,
      })
    );
  }
}
