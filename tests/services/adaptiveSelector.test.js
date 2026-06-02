/**
 * Unit tests for adaptiveSelector.js
 *
 * Covers:
 *  - pickNextSubtopic: focus short-circuit, null on empty allowed, bucket
 *    classification, 60/30/10 distribution, fallback ordering, non-adaptive
 *    intents bias toward weak.
 *  - computeDifficultyTarget: fixed intents, mixed random, adaptive strong
 *    reinforcement, first-session fallback, general adaptive clamping.
 *
 * Requirements: 3.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.1, 9.3
 */

import { pickNextSubtopic, computeDifficultyTarget } from '../../src/services/adaptiveSelector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal profile with the given subtopics. */
function makeProfile(subtopics = {}) {
  return { subtopics, aggregate: 0 };
}

/** Build a subtopic entry. */
function sub(level, attempts) {
  return { level, attempts, lastSeen: null, history: [] };
}

/** A deterministic RNG that always returns a fixed value. */
function fixedRng(value) {
  return () => value;
}

/** A sequential RNG that cycles through the provided values. */
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// ---------------------------------------------------------------------------
// pickNextSubtopic
// ---------------------------------------------------------------------------

describe('pickNextSubtopic', () => {
  const taxonomy = ['hooks', 'state', 'context', 'lifecycle', 'performance'];

  // -------------------------------------------------------------------------
  // Focus short-circuit
  // -------------------------------------------------------------------------

  test('returns focus subtopic immediately when focus is set', () => {
    const profile = makeProfile({});
    const result = pickNextSubtopic(profile, taxonomy, [], 'hooks', 'adaptive');
    expect(result).not.toBeNull();
    expect(result.subtopic).toBe('hooks');
  });

  test('focus subtopic category is classified correctly (unexplored)', () => {
    const profile = makeProfile({});
    const result = pickNextSubtopic(profile, taxonomy, [], 'hooks', 'adaptive');
    expect(result.category).toBe('unexplored');
  });

  test('focus subtopic category is classified correctly (weak)', () => {
    const profile = makeProfile({ hooks: sub(3, 2) });
    const result = pickNextSubtopic(profile, taxonomy, [], 'hooks', 'adaptive');
    expect(result.category).toBe('weak');
  });

  test('focus subtopic category is classified correctly (strong)', () => {
    const profile = makeProfile({ hooks: sub(8, 5) });
    const result = pickNextSubtopic(profile, taxonomy, [], 'hooks', 'adaptive');
    expect(result.category).toBe('strong');
  });

  test('focus subtopic bypasses ignored list', () => {
    const profile = makeProfile({});
    // 'hooks' is in ignored but focus overrides
    const result = pickNextSubtopic(profile, taxonomy, ['hooks'], 'hooks', 'adaptive');
    expect(result).not.toBeNull();
    expect(result.subtopic).toBe('hooks');
  });

  // -------------------------------------------------------------------------
  // Null when allowed is empty
  // -------------------------------------------------------------------------

  test('returns null when taxonomy is empty', () => {
    const profile = makeProfile({});
    expect(pickNextSubtopic(profile, [], [], null, 'adaptive')).toBeNull();
  });

  test('returns null when all taxonomy entries are ignored', () => {
    const profile = makeProfile({});
    expect(pickNextSubtopic(profile, taxonomy, taxonomy, null, 'adaptive')).toBeNull();
  });

  test('returns null when taxonomy is null', () => {
    const profile = makeProfile({});
    expect(pickNextSubtopic(profile, null, [], null, 'adaptive')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Bucket classification
  // -------------------------------------------------------------------------

  test('subtopic with attempts=0 is unexplored', () => {
    const profile = makeProfile({});
    // All subtopics are unexplored; with rng < 0.6 primary=weak (empty), falls back to unexplored
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'adaptive', { rng: fixedRng(0.7) });
    expect(result).not.toBeNull();
    expect(result.category).toBe('unexplored');
  });

  test('subtopic with attempts>0 and level<5 is weak', () => {
    const profile = makeProfile({ hooks: sub(3, 2) });
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'adaptive', { rng: fixedRng(0.1) });
    expect(result).not.toBeNull();
    expect(result.category).toBe('weak');
  });

  test('subtopic with level>=7 is strong', () => {
    const profile = makeProfile({ hooks: sub(8, 5) });
    // rng >= 0.9 → primary = strong
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'adaptive', { rng: fixedRng(0.95) });
    expect(result).not.toBeNull();
    expect(result.category).toBe('strong');
  });

  // -------------------------------------------------------------------------
  // Adaptive 60/30/10 distribution
  // -------------------------------------------------------------------------

  test('adaptive: rng < 0.6 selects from weak bucket', () => {
    const profile = makeProfile({
      hooks: sub(3, 2),    // weak
      state: sub(0, 0),    // unexplored
      context: sub(8, 5),  // strong
    });
    const result = pickNextSubtopic(profile, ['hooks', 'state', 'context'], [], null, 'adaptive', {
      rng: seqRng([0.1, 0.5]), // first call for bucket selection, second for pickRandom
    });
    expect(result.subtopic).toBe('hooks');
    expect(result.category).toBe('weak');
  });

  test('adaptive: 0.6 <= rng < 0.9 selects from unexplored bucket', () => {
    const profile = makeProfile({
      hooks: sub(3, 2),    // weak
      state: sub(0, 0),    // unexplored
      context: sub(8, 5),  // strong
    });
    const result = pickNextSubtopic(profile, ['hooks', 'state', 'context'], [], null, 'adaptive', {
      rng: seqRng([0.75, 0.0]),
    });
    expect(result.subtopic).toBe('state');
    expect(result.category).toBe('unexplored');
  });

  test('adaptive: rng >= 0.9 selects from strong bucket', () => {
    const profile = makeProfile({
      hooks: sub(3, 2),    // weak
      state: sub(0, 0),    // unexplored
      context: sub(8, 5),  // strong
    });
    const result = pickNextSubtopic(profile, ['hooks', 'state', 'context'], [], null, 'adaptive', {
      rng: seqRng([0.95, 0.0]),
    });
    expect(result.subtopic).toBe('context');
    expect(result.category).toBe('strong');
  });

  // -------------------------------------------------------------------------
  // Fallback ordering
  // -------------------------------------------------------------------------

  test('falls back from weak to unexplored when weak is empty', () => {
    // All subtopics are unexplored (no attempts), so weak bucket is empty.
    const profile = makeProfile({});
    // rng < 0.6 → primary = weak (empty) → fallback to unexplored
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'adaptive', { rng: fixedRng(0.1) });
    expect(result).not.toBeNull();
    expect(result.category).toBe('unexplored');
  });

  test('falls back from unexplored to strong when unexplored is empty', () => {
    // Only strong subtopics exist.
    const profile = makeProfile({ hooks: sub(8, 5) });
    // rng in [0.6, 0.9) → primary = unexplored (empty) → fallback: weak (empty) → unexplored (empty) → strong
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'adaptive', { rng: seqRng([0.75, 0.0]) });
    expect(result).not.toBeNull();
    expect(result.category).toBe('strong');
  });

  test('falls back to any allowed when all named buckets are empty', () => {
    // A subtopic with attempts>0 and 5<=level<7 is in none of the three named buckets.
    const profile = makeProfile({ hooks: sub(6, 3) });
    // rng < 0.6 → primary = weak (empty) → weak (empty) → unexplored (empty) → strong (empty) → allowed
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'adaptive', { rng: fixedRng(0.1) });
    expect(result).not.toBeNull();
    expect(result.subtopic).toBe('hooks');
    expect(result.category).toBe('any');
  });

  // -------------------------------------------------------------------------
  // Non-adaptive intents bias toward weak
  // -------------------------------------------------------------------------

  test('easy intent: primary bucket is weak', () => {
    const profile = makeProfile({
      hooks: sub(3, 2),    // weak
      state: sub(0, 0),    // unexplored
    });
    const result = pickNextSubtopic(profile, ['hooks', 'state'], [], null, 'easy', { rng: fixedRng(0.0) });
    expect(result.subtopic).toBe('hooks');
    expect(result.category).toBe('weak');
  });

  test('medium intent: primary bucket is weak', () => {
    const profile = makeProfile({ hooks: sub(2, 1) });
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'medium', { rng: fixedRng(0.0) });
    expect(result.category).toBe('weak');
  });

  test('hard intent: primary bucket is weak', () => {
    const profile = makeProfile({ hooks: sub(2, 1) });
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'hard', { rng: fixedRng(0.0) });
    expect(result.category).toBe('weak');
  });

  test('mixed intent: primary bucket is weak', () => {
    const profile = makeProfile({ hooks: sub(2, 1) });
    const result = pickNextSubtopic(profile, ['hooks'], [], null, 'mixed', { rng: fixedRng(0.0) });
    expect(result.category).toBe('weak');
  });

  // -------------------------------------------------------------------------
  // Ignored subtopics are excluded
  // -------------------------------------------------------------------------

  test('ignored subtopics are excluded from selection', () => {
    const profile = makeProfile({ hooks: sub(3, 2), state: sub(4, 2) });
    // Ignore 'hooks'; only 'state' remains
    const result = pickNextSubtopic(profile, ['hooks', 'state'], ['hooks'], null, 'adaptive', {
      rng: fixedRng(0.1),
    });
    expect(result).not.toBeNull();
    expect(result.subtopic).toBe('state');
  });

  test('ignored set can be a Set object', () => {
    const profile = makeProfile({ hooks: sub(3, 2), state: sub(4, 2) });
    const result = pickNextSubtopic(profile, ['hooks', 'state'], new Set(['hooks']), null, 'adaptive', {
      rng: fixedRng(0.1),
    });
    expect(result).not.toBeNull();
    expect(result.subtopic).toBe('state');
  });

  // -------------------------------------------------------------------------
  // Distribution test (statistical)
  // -------------------------------------------------------------------------

  test('adaptive 60/30/10 distribution is approximately correct over 3000 trials', () => {
    const profile = makeProfile({
      weak1: sub(2, 1),
      weak2: sub(3, 2),
      unexplored1: sub(0, 0),
      unexplored2: sub(0, 0),
      strong1: sub(8, 5),
    });
    const tax = ['weak1', 'weak2', 'unexplored1', 'unexplored2', 'strong1'];

    const counts = { weak: 0, unexplored: 0, strong: 0, any: 0 };
    const N = 3000;

    for (let i = 0; i < N; i++) {
      const result = pickNextSubtopic(profile, tax, [], null, 'adaptive');
      counts[result.category]++;
    }

    const weakFrac = counts.weak / N;
    const unexploredFrac = counts.unexplored / N;
    const strongFrac = counts.strong / N;

    // Allow ±5% tolerance for statistical variation
    expect(weakFrac).toBeGreaterThan(0.55);
    expect(weakFrac).toBeLessThan(0.65);
    expect(unexploredFrac).toBeGreaterThan(0.25);
    expect(unexploredFrac).toBeLessThan(0.35);
    expect(strongFrac).toBeGreaterThan(0.05);
    expect(strongFrac).toBeLessThan(0.15);
  });
});

// ---------------------------------------------------------------------------
// computeDifficultyTarget
// ---------------------------------------------------------------------------

describe('computeDifficultyTarget', () => {
  // -------------------------------------------------------------------------
  // Fixed intents
  // -------------------------------------------------------------------------

  test('easy always returns 3', () => {
    expect(computeDifficultyTarget('easy', 5, 'weak')).toBe(3);
    expect(computeDifficultyTarget('easy', null, 'unexplored')).toBe(3);
    expect(computeDifficultyTarget('easy', 9, 'strong')).toBe(3);
  });

  test('medium always returns 5', () => {
    expect(computeDifficultyTarget('medium', 5, 'weak')).toBe(5);
    expect(computeDifficultyTarget('medium', null, 'unexplored')).toBe(5);
    expect(computeDifficultyTarget('medium', 9, 'strong')).toBe(5);
  });

  test('hard always returns 8', () => {
    expect(computeDifficultyTarget('hard', 5, 'weak')).toBe(8);
    expect(computeDifficultyTarget('hard', null, 'unexplored')).toBe(8);
    expect(computeDifficultyTarget('hard', 9, 'strong')).toBe(8);
  });

  // -------------------------------------------------------------------------
  // Mixed: uniform random integer in [1, 10]
  // -------------------------------------------------------------------------

  test('mixed returns an integer in [1, 10]', () => {
    for (let i = 0; i < 100; i++) {
      const result = computeDifficultyTarget('mixed', 5, 'weak');
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  test('mixed uses the injected rng', () => {
    // rng() = 0.0 → floor(0.0 * 10) + 1 = 1
    expect(computeDifficultyTarget('mixed', 5, 'weak', { rng: fixedRng(0.0) })).toBe(1);
    // rng() = 0.9 → floor(0.9 * 10) + 1 = 10
    expect(computeDifficultyTarget('mixed', 5, 'weak', { rng: fixedRng(0.9) })).toBe(10);
    // rng() = 0.5 → floor(0.5 * 10) + 1 = 6
    expect(computeDifficultyTarget('mixed', 5, 'weak', { rng: fixedRng(0.5) })).toBe(6);
  });

  // -------------------------------------------------------------------------
  // Adaptive + strong reinforcement
  // -------------------------------------------------------------------------

  test('adaptive + strong: returns ceil(level) + 1', () => {
    expect(computeDifficultyTarget('adaptive', 7, 'strong')).toBe(8);
    expect(computeDifficultyTarget('adaptive', 7.5, 'strong')).toBe(9);
    expect(computeDifficultyTarget('adaptive', 8, 'strong')).toBe(9);
  });

  test('adaptive + strong: caps at 10 when level is 10', () => {
    expect(computeDifficultyTarget('adaptive', 10, 'strong')).toBe(10);
  });

  test('adaptive + strong: caps at 10 when ceil(level)+1 would exceed 10', () => {
    expect(computeDifficultyTarget('adaptive', 9.5, 'strong')).toBe(10);
    expect(computeDifficultyTarget('adaptive', 9, 'strong')).toBe(10);
  });

  // -------------------------------------------------------------------------
  // Adaptive: first-session fallback
  // -------------------------------------------------------------------------

  test('adaptive: returns 5 when subtopicLevel is null', () => {
    expect(computeDifficultyTarget('adaptive', null, 'unexplored')).toBe(5);
    expect(computeDifficultyTarget('adaptive', null, 'weak')).toBe(5);
    expect(computeDifficultyTarget('adaptive', null, 'any')).toBe(5);
  });

  test('adaptive: returns 5 when subtopicLevel is undefined', () => {
    expect(computeDifficultyTarget('adaptive', undefined, 'unexplored')).toBe(5);
  });

  test('adaptive: returns 5 when subtopicLevel is NaN', () => {
    expect(computeDifficultyTarget('adaptive', NaN, 'unexplored')).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Adaptive: general clamped rounding
  // -------------------------------------------------------------------------

  test('adaptive: rounds and clamps level to [1, 10]', () => {
    expect(computeDifficultyTarget('adaptive', 3.4, 'weak')).toBe(3);
    expect(computeDifficultyTarget('adaptive', 3.5, 'weak')).toBe(4);
    expect(computeDifficultyTarget('adaptive', 6.7, 'any')).toBe(7);
  });

  test('adaptive: clamps below 1 to 1', () => {
    expect(computeDifficultyTarget('adaptive', 0, 'weak')).toBe(1);
    expect(computeDifficultyTarget('adaptive', -5, 'weak')).toBe(1);
  });

  test('adaptive: clamps above 10 to 10', () => {
    expect(computeDifficultyTarget('adaptive', 11, 'any')).toBe(10);
    expect(computeDifficultyTarget('adaptive', 100, 'any')).toBe(10);
  });

  test('adaptive: result is always an integer', () => {
    const levels = [0, 1, 2.3, 4.5, 5, 6.7, 7, 8.9, 10];
    const categories = ['weak', 'unexplored', 'strong', 'any'];
    for (const level of levels) {
      for (const category of categories) {
        const result = computeDifficultyTarget('adaptive', level, category);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      }
    }
  });
});
