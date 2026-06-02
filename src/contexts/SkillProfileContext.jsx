/**
 * SkillProfileContext.jsx
 *
 * Provides per-topic skill profile access and mutation to the React component
 * tree. Profiles are cached in a Map (topicId → profile) held in a ref so
 * reads are synchronous after the first load. The cache is invalidated on
 * every write so the next read always reflects the latest persisted state.
 *
 * Context value shape:
 *   {
 *     getProfile:      async (topicId) => profile | null,
 *     applyEvaluation: async (topicId, subtopicName, score, timestamp) => updatedProfile
 *   }
 *
 * The `useSkillProfile(topicId)` hook wraps the context and returns:
 *   { profile, loading, applyEvaluation: (subtopicName, score, timestamp) => ... }
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { applyEvaluation as computeApplyEvaluation } from '../services/skillProfile.js';
import { getSkillProfile, putSkillProfile } from '../services/sessionService.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** @type {React.Context<{ getProfile: Function, applyEvaluation: Function } | null>} */
export const SkillProfileContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Wrap your application (or the relevant subtree) with this provider so that
 * any descendant can call `useSkillProfile(topicId)` to read or update a
 * topic's skill profile.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function SkillProfileProvider({ children }) {
  /**
   * In-memory cache: topicId → profile object.
   * Held in a ref so mutations do not trigger re-renders of the provider
   * itself; consumers re-render only when they receive a new profile value
   * through the `useSkillProfile` hook.
   *
   * @type {React.MutableRefObject<Map<string, Object|null>>}
   */
  const cacheRef = useRef(new Map());

  // -------------------------------------------------------------------------
  // getProfile
  // -------------------------------------------------------------------------

  /**
   * Return the skill profile for the given topicId.
   *
   * - Cache hit  → return cached value immediately (may be null if the topic
   *                has no profile yet).
   * - Cache miss → load from IndexedDB, populate the cache, return the value.
   *
   * @param {string} topicId
   * @returns {Promise<Object|null>}
   */
  const getProfile = useCallback(async (topicId) => {
    const cache = cacheRef.current;

    if (cache.has(topicId)) {
      return cache.get(topicId);
    }

    const profile = await getSkillProfile(topicId);
    cache.set(topicId, profile);
    return profile;
  }, []);

  // -------------------------------------------------------------------------
  // applyEvaluation
  // -------------------------------------------------------------------------

  /**
   * Apply one evaluation result to the skill profile for the given topic.
   *
   * Steps:
   *  1. Load the current profile (via getProfile — uses cache when warm).
   *  2. Compute the updated profile using the pure math function.
   *  3. Attach topicId to the new profile object (required by putSkillProfile).
   *  4. Persist the new profile to IndexedDB.
   *  5. Update the cache with the new profile.
   *  6. Return the new profile.
   *
   * @param {string} topicId
   * @param {string} subtopicName
   * @param {number} score        - Integer 0–10.
   * @param {number} timestamp    - e.g. Date.now().
   * @returns {Promise<Object>} The updated profile.
   */
  const applyEvaluation = useCallback(
    async (topicId, subtopicName, score, timestamp, difficulty = 5) => {
      // 1. Load current profile (null → empty profile handled by pure fn).
      const currentProfile = await getProfile(topicId);

      // 2. Compute new profile via pure math function.
      const newProfile = computeApplyEvaluation(
        currentProfile,
        subtopicName,
        score,
        timestamp,
        difficulty,
      );

      // 3. Attach topicId so putSkillProfile can use it as the primary key.
      const profileWithId = { ...newProfile, topicId };

      // 4. Persist to IndexedDB.
      await putSkillProfile(profileWithId);

      // 5. Invalidate cache with the fresh value.
      cacheRef.current.set(topicId, profileWithId);

      // 6. Return the updated profile.
      return profileWithId;
    },
    [getProfile],
  );

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = { getProfile, applyEvaluation };

  return (
    <SkillProfileContext.Provider value={value}>
      {children}
    </SkillProfileContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook: useSkillProfile(topicId)
// ---------------------------------------------------------------------------

/**
 * Convenience hook that loads and subscribes to the skill profile for a
 * specific topic.
 *
 * Calls `getProfile(topicId)` on mount and whenever `topicId` changes.
 * Returns a pre-bound `applyEvaluation` so callers do not need to pass
 * `topicId` themselves.
 *
 * Must be called inside a `<SkillProfileProvider>` subtree.
 *
 * @param {string} topicId
 * @returns {{
 *   profile: Object|null,
 *   loading: boolean,
 *   applyEvaluation: (subtopicName: string, score: number, timestamp: number) => Promise<Object>
 * }}
 */
export function useSkillProfile(topicId) {
  const ctx = useContext(SkillProfileContext);
  if (ctx === null) {
    throw new Error('useSkillProfile must be used within a <SkillProfileProvider>');
  }

  const { getProfile, applyEvaluation: ctxApplyEvaluation } = ctx;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the profile whenever topicId changes.
  useEffect(() => {
    if (!topicId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getProfile(topicId)
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
        }
      })
      .catch((err) => {
        console.error('[useSkillProfile] Failed to load profile:', err);
        if (!cancelled) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [topicId, getProfile]);

  /**
   * Pre-bound applyEvaluation — callers only need to pass subtopicName,
   * score, and timestamp; topicId is captured from the hook argument.
   *
   * After a successful update the local `profile` state is refreshed so
   * the component re-renders with the latest data.
   *
   * @param {string} subtopicName
   * @param {number} score
   * @param {number} timestamp
   * @returns {Promise<Object>}
   */
  const applyEvaluation = useCallback(
    async (subtopicName, score, timestamp, difficulty = 5) => {
      const updated = await ctxApplyEvaluation(topicId, subtopicName, score, timestamp, difficulty);
      setProfile(updated);
      return updated;
    },
    [topicId, ctxApplyEvaluation],
  );

  return { profile, loading, applyEvaluation };
}
