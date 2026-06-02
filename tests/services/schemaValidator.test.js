import {
  validateQuestion,
  validateEvaluation,
  validateSubtopics,
} from '../../src/services/schemaValidator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert the return value is always a well-formed { valid, errors } object */
function assertShape(result) {
  expect(result).toBeDefined();
  expect(typeof result.valid).toBe('boolean');
  expect(Array.isArray(result.errors)).toBe(true);
}

// ---------------------------------------------------------------------------
// validateQuestion
// ---------------------------------------------------------------------------

describe('validateQuestion', () => {
  describe('valid inputs', () => {
    test('accepts a well-formed question object', () => {
      const result = validateQuestion({
        question: 'What is a closure?',
        subtopic: 'closures',
        difficulty: 5,
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts difficulty at lower bound (1)', () => {
      const result = validateQuestion({
        question: 'Explain hoisting.',
        subtopic: 'hoisting',
        difficulty: 1,
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts difficulty at upper bound (10)', () => {
      const result = validateQuestion({
        question: 'Describe the V8 JIT pipeline.',
        subtopic: 'engine internals',
        difficulty: 10,
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts question and subtopic with surrounding whitespace (non-empty after trim)', () => {
      const result = validateQuestion({
        question: '  What is a closure?  ',
        subtopic: '  closures  ',
        difficulty: 3,
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });

  describe('invalid inputs — missing / wrong-type fields', () => {
    test('rejects null', () => {
      const result = validateQuestion(null);
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects undefined', () => {
      const result = validateQuestion(undefined);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects a primitive (number)', () => {
      const result = validateQuestion(42);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects an array', () => {
      const result = validateQuestion([]);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects missing question field', () => {
      const result = validateQuestion({ subtopic: 'hooks', difficulty: 5 });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /question/i.test(e))).toBe(true);
    });

    test('rejects empty question string', () => {
      const result = validateQuestion({ question: '', subtopic: 'hooks', difficulty: 5 });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects whitespace-only question string', () => {
      const result = validateQuestion({ question: '   ', subtopic: 'hooks', difficulty: 5 });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects missing subtopic field', () => {
      const result = validateQuestion({ question: 'Q?', difficulty: 5 });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /subtopic/i.test(e))).toBe(true);
    });

    test('rejects empty subtopic string', () => {
      const result = validateQuestion({ question: 'Q?', subtopic: '', difficulty: 5 });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects non-integer difficulty (float)', () => {
      const result = validateQuestion({ question: 'Q?', subtopic: 's', difficulty: 5.5 });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /difficulty/i.test(e))).toBe(true);
    });

    test('rejects difficulty below range (0)', () => {
      const result = validateQuestion({ question: 'Q?', subtopic: 's', difficulty: 0 });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects difficulty above range (11)', () => {
      const result = validateQuestion({ question: 'Q?', subtopic: 's', difficulty: 11 });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects difficulty as string', () => {
      const result = validateQuestion({ question: 'Q?', subtopic: 's', difficulty: '5' });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects difficulty as null', () => {
      const result = validateQuestion({ question: 'Q?', subtopic: 's', difficulty: null });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('accumulates multiple errors', () => {
      const result = validateQuestion({ question: '', subtopic: '', difficulty: 99 });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('never throws', () => {
    const weirdInputs = [
      null, undefined, 0, '', false, true, [], {}, Symbol('x'),
      { question: null, subtopic: null, difficulty: null },
      { question: {}, subtopic: [], difficulty: {} },
    ];

    weirdInputs.forEach((input) => {
      test(`does not throw for input: ${String(input)}`, () => {
        expect(() => validateQuestion(input)).not.toThrow();
        assertShape(validateQuestion(input));
      });
    });
  });
});

// ---------------------------------------------------------------------------
// validateEvaluation
// ---------------------------------------------------------------------------

describe('validateEvaluation', () => {
  describe('valid inputs', () => {
    test('accepts a well-formed evaluation object', () => {
      const result = validateEvaluation({
        score: 7,
        strengths: 'Good explanation of closures.',
        gaps: 'Did not mention memory implications.',
        modelAnswer: 'A closure is a function that retains access to its lexical scope.',
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts score at lower bound (0)', () => {
      const result = validateEvaluation({
        score: 0,
        strengths: 'Attempted.',
        gaps: 'Completely wrong.',
        modelAnswer: 'Correct answer here.',
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts score at upper bound (10)', () => {
      const result = validateEvaluation({
        score: 10,
        strengths: 'Perfect.',
        gaps: 'None.',
        modelAnswer: 'Model answer.',
      });
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });

  describe('invalid inputs — missing / wrong-type fields', () => {
    test('rejects null', () => {
      const result = validateEvaluation(null);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects undefined', () => {
      const result = validateEvaluation(undefined);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects an array', () => {
      const result = validateEvaluation([]);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects score below range (-1)', () => {
      const result = validateEvaluation({
        score: -1,
        strengths: 'S',
        gaps: 'G',
        modelAnswer: 'M',
      });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /score/i.test(e))).toBe(true);
    });

    test('rejects score above range (11)', () => {
      const result = validateEvaluation({
        score: 11,
        strengths: 'S',
        gaps: 'G',
        modelAnswer: 'M',
      });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects float score', () => {
      const result = validateEvaluation({
        score: 7.5,
        strengths: 'S',
        gaps: 'G',
        modelAnswer: 'M',
      });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects missing strengths', () => {
      const result = validateEvaluation({ score: 5, gaps: 'G', modelAnswer: 'M' });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /strengths/i.test(e))).toBe(true);
    });

    test('rejects empty strengths', () => {
      const result = validateEvaluation({ score: 5, strengths: '', gaps: 'G', modelAnswer: 'M' });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects whitespace-only strengths', () => {
      const result = validateEvaluation({ score: 5, strengths: '  ', gaps: 'G', modelAnswer: 'M' });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects missing gaps', () => {
      const result = validateEvaluation({ score: 5, strengths: 'S', modelAnswer: 'M' });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /gaps/i.test(e))).toBe(true);
    });

    test('rejects empty gaps', () => {
      const result = validateEvaluation({ score: 5, strengths: 'S', gaps: '', modelAnswer: 'M' });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects missing modelAnswer', () => {
      const result = validateEvaluation({ score: 5, strengths: 'S', gaps: 'G' });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /modelAnswer/i.test(e))).toBe(true);
    });

    test('rejects empty modelAnswer', () => {
      const result = validateEvaluation({ score: 5, strengths: 'S', gaps: 'G', modelAnswer: '' });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('accumulates multiple errors', () => {
      const result = validateEvaluation({ score: -5, strengths: '', gaps: '', modelAnswer: '' });
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('never throws', () => {
    const weirdInputs = [null, undefined, 42, 'string', [], {}, true, false];

    weirdInputs.forEach((input) => {
      test(`does not throw for input: ${String(input)}`, () => {
        expect(() => validateEvaluation(input)).not.toThrow();
        assertShape(validateEvaluation(input));
      });
    });
  });
});

// ---------------------------------------------------------------------------
// validateSubtopics
// ---------------------------------------------------------------------------

describe('validateSubtopics', () => {
  describe('valid inputs', () => {
    test('accepts an array of non-empty strings', () => {
      const result = validateSubtopics(['hooks', 'state management', 'context']);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts a single-element array', () => {
      const result = validateSubtopics(['hooks']);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('accepts strings with surrounding whitespace (non-empty after trim)', () => {
      const result = validateSubtopics(['  hooks  ', 'context']);
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });

  describe('invalid inputs', () => {
    test('rejects null', () => {
      const result = validateSubtopics(null);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects undefined', () => {
      const result = validateSubtopics(undefined);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects a plain object', () => {
      const result = validateSubtopics({ 0: 'hooks' });
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects a string (not an array)', () => {
      const result = validateSubtopics('hooks');
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects an empty array', () => {
      const result = validateSubtopics([]);
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => /empty/i.test(e))).toBe(true);
    });

    test('rejects array containing an empty string', () => {
      const result = validateSubtopics(['hooks', '']);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects array containing a whitespace-only string', () => {
      const result = validateSubtopics(['hooks', '   ']);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects array containing a non-string element (number)', () => {
      const result = validateSubtopics(['hooks', 42]);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects array containing null', () => {
      const result = validateSubtopics(['hooks', null]);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('rejects array containing an object', () => {
      const result = validateSubtopics(['hooks', { name: 'context' }]);
      assertShape(result);
      expect(result.valid).toBe(false);
    });

    test('reports errors for each invalid element', () => {
      const result = validateSubtopics(['', '', '']);
      assertShape(result);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe('never throws', () => {
    const weirdInputs = [null, undefined, 42, 'string', {}, true, false, Symbol('x')];

    weirdInputs.forEach((input) => {
      test(`does not throw for input: ${String(input)}`, () => {
        expect(() => validateSubtopics(input)).not.toThrow();
        assertShape(validateSubtopics(input));
      });
    });
  });
});
