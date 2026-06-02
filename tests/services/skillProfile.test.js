/**
 * Unit tests for src/services/skillProfile.js
 *
 * Covers:
 *  - computeLevel: empty, single-entry, two-entry, multi-entry (mean of last two)
 *  - computeAggregate: empty, all-zero attempts, weighted average
 *  - applyEvaluation: history append, truncation to 5, level recompute,
 *    attempts increment, lastSeen update, aggregate recompute, immutability
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import {
  computeLevel,
  computeAggregate,
  applyEvaluation,
} from '../../src/services/skillProfile.js';

// ---------------------------------------------------------------------------
// computeLevel
// ---------------------------------------------------------------------------

describe('computeLevel', () => {
  test('returns 0 for empty history', () => {
    expect(computeLevel([])).toBe(0);
  });

  test('returns 0 for null/undefined history', () => {
    expect(computeLevel(null)).toBe(0);
    expect(computeLevel(undefined)).toBe(0);
  });

  test('returns the single entry when history has one element', () => {
    expect(computeLevel([7])).toBe(7);
    expect(computeLevel([0])).toBe(0);
    expect(computeLevel([10])).toBe(10);
  });

  test('returns the mean of the two entries when history has exactly two elements', () => {
    expect(computeLevel([4, 8])).toBe(6);
    expect(computeLevel([0, 10])).toBe(5);
    expect(computeLevel([3, 3])).toBe(3);
  });

  test('returns the mean of the LAST two entries when history has more than two elements', () => {
    // history = [1, 2, 3, 4, 5] → mean of 4 and 5 = 4.5
    expect(computeLevel([1, 2, 3, 4, 5])).toBe(4.5);
    // history = [10, 0, 6] → mean of 0 and 6 = 3
    expect(computeLevel([10, 0, 6])).toBe(3);
  });

  test('ignores all but the last two entries', () => {
    // Only the last two matter regardless of earlier values.
    expect(computeLevel([9, 9, 9, 2, 4])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeAggregate
// ---------------------------------------------------------------------------

describe('computeAggregate', () => {
  test('returns 0 for empty subtopics object', () => {
    expect(computeAggregate({})).toBe(0);
  });

  test('returns 0 for null/undefined subtopics', () => {
    expect(computeAggregate(null)).toBe(0);
    expect(computeAggregate(undefined)).toBe(0);
  });

  test('returns 0 when all subtopics have 0 attempts', () => {
    const subtopics = {
      hooks: { level: 8, attempts: 0 },
      state: { level: 5, attempts: 0 },
    };
    expect(computeAggregate(subtopics)).toBe(0);
  });

  test('returns the level of the single subtopic when only one has attempts > 0', () => {
    const subtopics = {
      hooks: { level: 6, attempts: 3 },
      state: { level: 9, attempts: 0 },
    };
    expect(computeAggregate(subtopics)).toBe(6);
  });

  test('computes the attempts-weighted average correctly', () => {
    // (6*3 + 9*1) / (3+1) = (18+9)/4 = 27/4 = 6.75
    const subtopics = {
      hooks: { level: 6, attempts: 3 },
      state: { level: 9, attempts: 1 },
    };
    expect(computeAggregate(subtopics)).toBeCloseTo(6.75);
  });

  test('ignores subtopics with 0 attempts in the weighted average', () => {
    // Only hooks contributes: level 4, attempts 2 → aggregate = 4
    const subtopics = {
      hooks: { level: 4, attempts: 2 },
      state: { level: 10, attempts: 0 },
    };
    expect(computeAggregate(subtopics)).toBe(4);
  });

  test('handles equal attempts (simple average)', () => {
    // (2*1 + 8*1) / 2 = 5
    const subtopics = {
      a: { level: 2, attempts: 1 },
      b: { level: 8, attempts: 1 },
    };
    expect(computeAggregate(subtopics)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// applyEvaluation
// ---------------------------------------------------------------------------

describe('applyEvaluation', () => {
  const BASE_PROFILE = {
    subtopics: {},
    aggregate: 0,
  };

  test('creates a new subtopic entry when it does not exist yet', () => {
    const result = applyEvaluation(BASE_PROFILE, 'hooks', 7, 1000);
    expect(result.subtopics).toHaveProperty('hooks');
    expect(result.subtopics.hooks.history).toEqual([7]);
    expect(result.subtopics.hooks.level).toBe(7);
    expect(result.subtopics.hooks.attempts).toBe(1);
    expect(result.subtopics.hooks.lastSeen).toBe(1000);
  });

  test('appends score to existing history', () => {
    const profile = applyEvaluation(BASE_PROFILE, 'hooks', 4, 1000);
    const result = applyEvaluation(profile, 'hooks', 8, 2000);
    expect(result.subtopics.hooks.history).toEqual([4, 8]);
  });

  test('truncates history to the last 5 entries', () => {
    let profile = BASE_PROFILE;
    const scores = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < scores.length; i++) {
      profile = applyEvaluation(profile, 'hooks', scores[i], i * 100);
    }
    expect(profile.subtopics.hooks.history).toHaveLength(5);
    expect(profile.subtopics.hooks.history).toEqual([2, 3, 4, 5, 6]);
  });

  test('history is exactly the tail of the input sequence', () => {
    let profile = BASE_PROFILE;
    // Sequence kept below level 7 so the difficulty=5 default doesn't trip
    // the "too-easy" guard introduced by applyEvaluation. The test still
    // exercises history truncation across more than 5 entries.
    const scores = [2, 3, 4, 3, 2, 3, 4];
    for (let i = 0; i < scores.length; i++) {
      profile = applyEvaluation(profile, 'hooks', scores[i], i * 100);
    }
    // Last 5 of [2,3,4,3,2,3,4] = [4,3,2,3,4]
    expect(profile.subtopics.hooks.history).toEqual([4, 3, 2, 3, 4]);
  });

  test('recomputes level as mean of last two after two evaluations', () => {
    let profile = applyEvaluation(BASE_PROFILE, 'hooks', 4, 1000);
    profile = applyEvaluation(profile, 'hooks', 8, 2000);
    expect(profile.subtopics.hooks.level).toBe(6); // (4+8)/2
  });

  test('level equals single entry after first evaluation', () => {
    const result = applyEvaluation(BASE_PROFILE, 'hooks', 5, 1000);
    expect(result.subtopics.hooks.level).toBe(5);
  });

  test('level uses only the last two entries after five evaluations', () => {
    let profile = BASE_PROFILE;
    const scores = [1, 2, 3, 4, 5];
    for (let i = 0; i < scores.length; i++) {
      profile = applyEvaluation(profile, 'hooks', scores[i], i * 100);
    }
    // Last two: 4 and 5 → mean = 4.5
    expect(profile.subtopics.hooks.level).toBe(4.5);
  });

  test('level uses only the last two entries after six evaluations (history truncated)', () => {
    let profile = BASE_PROFILE;
    const scores = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < scores.length; i++) {
      profile = applyEvaluation(profile, 'hooks', scores[i], i * 100);
    }
    // History = [2,3,4,5,6], last two: 5 and 6 → mean = 5.5
    expect(profile.subtopics.hooks.level).toBe(5.5);
  });

  test('increments attempts by 1 on each call', () => {
    let profile = BASE_PROFILE;
    for (let i = 1; i <= 5; i++) {
      profile = applyEvaluation(profile, 'hooks', i, i * 100);
      expect(profile.subtopics.hooks.attempts).toBe(i);
    }
  });

  test('sets lastSeen to the provided timestamp', () => {
    let profile = applyEvaluation(BASE_PROFILE, 'hooks', 5, 1000);
    expect(profile.subtopics.hooks.lastSeen).toBe(1000);
    profile = applyEvaluation(profile, 'hooks', 7, 2000);
    expect(profile.subtopics.hooks.lastSeen).toBe(2000);
  });

  test('recomputes aggregate after each evaluation', () => {
    let profile = applyEvaluation(BASE_PROFILE, 'hooks', 6, 1000);
    // Only one subtopic with 1 attempt, level = 6 → aggregate = 6
    expect(profile.aggregate).toBe(6);

    profile = applyEvaluation(profile, 'state', 4, 2000);
    // hooks: level=6, attempts=1; state: level=4, attempts=1
    // aggregate = (6*1 + 4*1) / 2 = 5
    expect(profile.aggregate).toBe(5);
  });

  test('does not mutate the input profile', () => {
    const original = {
      subtopics: {
        hooks: { level: 5, attempts: 2, lastSeen: 500, history: [4, 6] },
      },
      aggregate: 5,
    };
    const originalSubtopicsCopy = JSON.parse(JSON.stringify(original.subtopics));

    applyEvaluation(original, 'hooks', 8, 1000);

    // Original must be unchanged.
    expect(original.subtopics).toEqual(originalSubtopicsCopy);
    expect(original.aggregate).toBe(5);
  });

  test('does not mutate the history array of the input profile', () => {
    const original = {
      subtopics: {
        hooks: { level: 5, attempts: 1, lastSeen: 500, history: [5] },
      },
      aggregate: 5,
    };
    const originalHistory = [...original.subtopics.hooks.history];

    applyEvaluation(original, 'hooks', 9, 1000);

    expect(original.subtopics.hooks.history).toEqual(originalHistory);
  });

  test('handles a null/undefined profile gracefully (treats as empty)', () => {
    const result = applyEvaluation(null, 'hooks', 7, 1000);
    expect(result.subtopics.hooks.history).toEqual([7]);
    expect(result.subtopics.hooks.attempts).toBe(1);
  });

  test('preserves other subtopics when updating one', () => {
    let profile = applyEvaluation(BASE_PROFILE, 'hooks', 6, 1000);
    profile = applyEvaluation(profile, 'state', 4, 2000);
    profile = applyEvaluation(profile, 'hooks', 8, 3000);

    // 'state' should be unchanged from its last update.
    expect(profile.subtopics.state.attempts).toBe(1);
    expect(profile.subtopics.state.history).toEqual([4]);
    // 'hooks' should reflect two evaluations.
    expect(profile.subtopics.hooks.attempts).toBe(2);
    expect(profile.subtopics.hooks.history).toEqual([6, 8]);
  });
});

// ---------------------------------------------------------------------------
// applyEvaluation — too-easy-question guard
// ---------------------------------------------------------------------------
//
// When `difficulty < currentLevel - 2`, the question is treated as
// practice-only: the profile is returned unchanged. This prevents a high-level
// user from regressing by acing trivially easy questions (which would otherwise
// be down-weighted by the `difficulty/5` multiplier).

describe('applyEvaluation — too-easy-question guard', () => {
  /**
   * Build a profile with a single subtopic at the given level and 2 attempts.
   * Aggregate is set to the same level for simplicity.
   */
  function profileAtLevel(subtopic, level) {
    return {
      subtopics: {
        [subtopic]: {
          level,
          attempts: 2,
          lastSeen: 100,
          history: [level, level],
        },
      },
      aggregate: level,
    };
  }

  test('returns the profile unchanged when difficulty is too easy', () => {
    // User at level 10, gets a difficulty-3 question. 3 < 10 - 2 = 8 → guard fires.
    const before = profileAtLevel('hooks', 10);
    const after = applyEvaluation(before, 'hooks', 10, 9999, /* difficulty */ 3);

    expect(after.subtopics.hooks.level).toBe(10);
    expect(after.subtopics.hooks.attempts).toBe(2);   // unchanged
    expect(after.subtopics.hooks.lastSeen).toBe(100); // unchanged
    expect(after.subtopics.hooks.history).toEqual([10, 10]);
    expect(after.aggregate).toBe(10);
  });

  test('reproduces the original bug scenario without regression', () => {
    // Bug: level-10 user aces two easy (difficulty-3) questions and drops to 6.
    // With the guard in place, the level stays at 10.
    let profile = profileAtLevel('hooks', 10);
    profile = applyEvaluation(profile, 'hooks', 10, 1000, /* diff */ 3);
    profile = applyEvaluation(profile, 'hooks', 10, 2000, /* diff */ 3);

    expect(profile.subtopics.hooks.level).toBe(10);
  });

  test('still applies the update when difficulty is exactly currentLevel - 2', () => {
    // Boundary: difficulty == currentLevel - 2 → guard does NOT fire.
    // User at level 8, gets a difficulty-6 question. 6 < 8-2=6 is false.
    const before = profileAtLevel('hooks', 8);
    const after = applyEvaluation(before, 'hooks', 10, 9999, /* diff */ 6);

    // Score is processed; weighted = 10 * 6/5 = 12, capped at 10.
    expect(after.subtopics.hooks.history).toEqual([8, 8, 10]);
    expect(after.subtopics.hooks.attempts).toBe(3);
    expect(after.subtopics.hooks.lastSeen).toBe(9999);
  });

  test('still applies the update when difficulty is harder than current level', () => {
    // Adaptive + strong reinforcement: user at 7 gets a difficulty-8 question.
    const before = profileAtLevel('hooks', 7);
    const after = applyEvaluation(before, 'hooks', 8, 9999, /* diff */ 8);

    // weighted = 8 * 8/5 = 12.8, capped at 10
    expect(after.subtopics.hooks.history).toEqual([7, 7, 10]);
    expect(after.subtopics.hooks.attempts).toBe(3);
  });

  test('does not fire on the first evaluation for a new subtopic', () => {
    // currentLevel for an unseen subtopic is 0, so difficulty < 0-2 = -2
    // is impossible → first-time questions always count regardless of difficulty.
    const result = applyEvaluation(
      { subtopics: {}, aggregate: 0 },
      'hooks',
      10,
      1000,
      /* difficulty */ 1,
    );

    // Score recorded (weighted = 10 * 1/5 = 2)
    expect(result.subtopics.hooks.history).toEqual([2]);
    expect(result.subtopics.hooks.attempts).toBe(1);
  });

  test('aggregate is preserved when the guard skips an update', () => {
    // Two subtopics: one at high level that will be skipped, one untouched.
    const profile = {
      subtopics: {
        hooks: { level: 9, attempts: 3, lastSeen: 100, history: [9, 9, 9] },
        state: { level: 5, attempts: 2, lastSeen: 200, history: [4, 6] },
      },
      aggregate: 7.4, // (9*3 + 5*2) / 5 = 7.4
    };

    // hooks at level 9, difficulty 4 → 4 < 9-2=7 → guard fires
    const after = applyEvaluation(profile, 'hooks', 10, 9999, /* diff */ 4);

    expect(after.aggregate).toBe(profile.aggregate);
    expect(after.subtopics).toEqual(profile.subtopics);
  });
});
