import { MockProvider, getScenario } from '../../../src/services/ai/MockProvider.js';
import { validateQuestion, validateEvaluation, validateSubtopics } from '../../../src/services/schemaValidator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseContext = {
  topic: 'JavaScript',
  difficultyTarget: 6,
  questionsAsked: 0,
  subtopicsCovered: [],
  recentScores: [],
  weakestSubtopic: null,
  avoidSubtopics: [],
  focusSubtopic: null,
  freeTextInstruction: '',
  taxonomy: ['closures', 'prototypes', 'async/await'],
};

// ---------------------------------------------------------------------------
// getScenario helper
// ---------------------------------------------------------------------------

describe('getScenario', () => {
  it('returns "happy-path" by default', () => {
    expect(getScenario()).toBe('happy-path');
  });

  it('reads VITE_MOCK_SCENARIO from process.env', () => {
    const original = process.env.VITE_MOCK_SCENARIO;
    process.env.VITE_MOCK_SCENARIO = 'slow';
    expect(getScenario()).toBe('slow');
    if (original === undefined) {
      delete process.env.VITE_MOCK_SCENARIO;
    } else {
      process.env.VITE_MOCK_SCENARIO = original;
    }
  });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('MockProvider constructor', () => {
  it('defaults to happy-path when no scenario is provided', () => {
    const p = new MockProvider();
    expect(p.scenario).toBe('happy-path');
  });

  it('accepts a scenario option', () => {
    const p = new MockProvider({ scenario: 'slow' });
    expect(p.scenario).toBe('slow');
  });

  it('accepts an empty options object', () => {
    const p = new MockProvider({});
    expect(p.scenario).toBe('happy-path');
  });
});

// ---------------------------------------------------------------------------
// happy-path scenario
// ---------------------------------------------------------------------------

describe('MockProvider — happy-path', () => {
  let provider;
  beforeEach(() => { provider = new MockProvider({ scenario: 'happy-path' }); });

  describe('generateQuestion', () => {
    it('returns a valid question shape', async () => {
      const result = await provider.generateQuestion(baseContext);
      const { valid } = validateQuestion(result);
      expect(valid).toBe(true);
    });

    it('echoes difficultyTarget from context', async () => {
      const result = await provider.generateQuestion({ ...baseContext, difficultyTarget: 7 });
      expect(result.difficulty).toBe(7);
    });

    it('uses first taxonomy entry as subtopic', async () => {
      const result = await provider.generateQuestion(baseContext);
      expect(result.subtopic).toBe('closures');
    });

    it('falls back to "general" when taxonomy is empty', async () => {
      const result = await provider.generateQuestion({ ...baseContext, taxonomy: [] });
      expect(result.subtopic).toBe('general');
    });

    it('falls back to difficulty 5 when difficultyTarget is absent', async () => {
      const result = await provider.generateQuestion({ ...baseContext, difficultyTarget: undefined });
      expect(result.difficulty).toBe(5);
    });
  });

  describe('evaluateAnswer', () => {
    it('returns a valid evaluation shape', async () => {
      const result = await provider.evaluateAnswer('What is a closure?', 'A closure captures outer scope.');
      const { valid } = validateEvaluation(result);
      expect(valid).toBe(true);
    });

    it('score is in [0, 10]', async () => {
      const result = await provider.evaluateAnswer('q', 'short');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('score increases with longer answers (up to cap)', async () => {
      const short = await provider.evaluateAnswer('q', 'hi');
      const long = await provider.evaluateAnswer('q', 'a'.repeat(200));
      expect(long.score).toBeGreaterThanOrEqual(short.score);
    });

    it('handles empty answer without throwing', async () => {
      const result = await provider.evaluateAnswer('q', '');
      expect(result.score).toBe(3); // Math.floor(0/20) + 3 = 3
    });

    it('handles null answer without throwing', async () => {
      const result = await provider.evaluateAnswer('q', null);
      expect(result.score).toBe(3);
    });
  });

  describe('suggestSubtopics', () => {
    it('returns a valid subtopics array', async () => {
      const result = await provider.suggestSubtopics('React');
      const { valid } = validateSubtopics(result);
      expect(valid).toBe(true);
    });

    it('returns exactly 12 subtopics for known topics', async () => {
      const result = await provider.suggestSubtopics('React');
      expect(result).toHaveLength(12);
    });

    it('returns React-specific subtopics for "React"', async () => {
      const result = await provider.suggestSubtopics('React');
      expect(result).toContain('hooks');
    });

    it('returns JavaScript-specific subtopics for "JavaScript"', async () => {
      const result = await provider.suggestSubtopics('JavaScript');
      expect(result).toContain('closures');
    });

    it('returns 12 generic subtopics for unknown topics', async () => {
      const result = await provider.suggestSubtopics('UnknownTopic');
      expect(result).toHaveLength(12);
      expect(result.every(s => typeof s === 'string')).toBe(true);
    });

    it('is case-insensitive for topic lookup', async () => {
      const lower = await provider.suggestSubtopics('react');
      const upper = await provider.suggestSubtopics('REACT');
      expect(lower).toEqual(upper);
    });
  });
});

// ---------------------------------------------------------------------------
// slow scenario
// ---------------------------------------------------------------------------

describe('MockProvider — slow', () => {
  let provider;
  beforeEach(() => { provider = new MockProvider({ scenario: 'slow' }); });

  it('generateQuestion resolves with valid shape after fake timer advance', async () => {
    jest.useFakeTimers();
    const promise = provider.generateQuestion(baseContext);
    jest.advanceTimersByTime(2500); // advance past max 2000 ms delay
    const result = await promise;
    const { valid } = validateQuestion(result);
    expect(valid).toBe(true);
    jest.useRealTimers();
  });

  it('evaluateAnswer resolves with valid shape after fake timer advance', async () => {
    jest.useFakeTimers();
    const promise = provider.evaluateAnswer('q', 'answer');
    jest.advanceTimersByTime(2500);
    const result = await promise;
    const { valid } = validateEvaluation(result);
    expect(valid).toBe(true);
    jest.useRealTimers();
  });

  it('suggestSubtopics resolves with valid shape after fake timer advance', async () => {
    jest.useFakeTimers();
    const promise = provider.suggestSubtopics('React');
    jest.advanceTimersByTime(2500);
    const result = await promise;
    const { valid } = validateSubtopics(result);
    expect(valid).toBe(true);
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// malformed-json scenario
// ---------------------------------------------------------------------------

describe('MockProvider — malformed-json', () => {
  let provider;
  beforeEach(() => { provider = new MockProvider({ scenario: 'malformed-json' }); });

  it('generateQuestion returns object that fails validateQuestion (missing subtopic)', async () => {
    const result = await provider.generateQuestion(baseContext);
    const { valid } = validateQuestion(result);
    expect(valid).toBe(false);
  });

  it('evaluateAnswer returns object that fails validateEvaluation (score out of range)', async () => {
    const result = await provider.evaluateAnswer('q', 'a');
    const { valid } = validateEvaluation(result);
    expect(valid).toBe(false);
  });

  it('suggestSubtopics returns array that fails validateSubtopics (non-string element)', async () => {
    const result = await provider.suggestSubtopics('React');
    const { valid } = validateSubtopics(result);
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rate-limit scenario
// ---------------------------------------------------------------------------

describe('MockProvider — rate-limit', () => {
  let provider;
  beforeEach(() => { provider = new MockProvider({ scenario: 'rate-limit' }); });

  it('generateQuestion throws with status 429', async () => {
    await expect(provider.generateQuestion(baseContext)).rejects.toMatchObject({
      status: 429,
      message: 'rate limited',
    });
  });

  it('evaluateAnswer throws with status 429', async () => {
    await expect(provider.evaluateAnswer('q', 'a')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('suggestSubtopics throws with status 429', async () => {
    await expect(provider.suggestSubtopics('React')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('classifyError returns "rate_limit" for the thrown error', async () => {
    let caught;
    try { await provider.generateQuestion(baseContext); } catch (e) { caught = e; }
    expect(provider.classifyError(caught)).toBe('rate_limit');
  });
});

// ---------------------------------------------------------------------------
// network-fail scenario
// ---------------------------------------------------------------------------

describe('MockProvider — network-fail', () => {
  let provider;
  beforeEach(() => { provider = new MockProvider({ scenario: 'network-fail' }); });

  it('generateQuestion rejects with a network Error', async () => {
    await expect(provider.generateQuestion(baseContext)).rejects.toThrow('network error');
  });

  it('evaluateAnswer rejects with a network Error', async () => {
    await expect(provider.evaluateAnswer('q', 'a')).rejects.toThrow('network error');
  });

  it('suggestSubtopics rejects with a network Error', async () => {
    await expect(provider.suggestSubtopics('React')).rejects.toThrow('network error');
  });

  it('classifyError returns "network" for the thrown error', async () => {
    let caught;
    try { await provider.generateQuestion(baseContext); } catch (e) { caught = e; }
    expect(provider.classifyError(caught)).toBe('network');
  });
});

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe('MockProvider — classifyError', () => {
  let provider;
  beforeEach(() => { provider = new MockProvider(); });

  it('returns "rate_limit" for status 429', () => {
    expect(provider.classifyError({ status: 429 })).toBe('rate_limit');
  });

  it('returns "invalid" for 4xx errors other than 429', () => {
    expect(provider.classifyError({ status: 400 })).toBe('invalid');
    expect(provider.classifyError({ status: 401 })).toBe('invalid');
    expect(provider.classifyError({ status: 403 })).toBe('invalid');
    expect(provider.classifyError({ status: 404 })).toBe('invalid');
    expect(provider.classifyError({ status: 422 })).toBe('invalid');
  });

  it('returns "transient" for 5xx errors', () => {
    expect(provider.classifyError({ status: 500 })).toBe('transient');
    expect(provider.classifyError({ status: 502 })).toBe('transient');
    expect(provider.classifyError({ status: 503 })).toBe('transient');
  });

  it('returns "malformed" for SyntaxError (JSON parse failure)', () => {
    const err = new SyntaxError('Unexpected token < in JSON');
    expect(provider.classifyError(err)).toBe('malformed');
  });

  it('returns "network" for Error with "network" in message', () => {
    expect(provider.classifyError(new Error('network error'))).toBe('network');
    expect(provider.classifyError(new Error('Network request failed'))).toBe('network');
  });

  it('returns "transient" for TypeError with "failed to fetch" message', () => {
    expect(provider.classifyError(new TypeError('Failed to fetch'))).toBe('transient');
  });

  it('returns "unknown" for unrecognized errors', () => {
    expect(provider.classifyError(null)).toBe('unknown');
    expect(provider.classifyError(undefined)).toBe('unknown');
    expect(provider.classifyError(new Error('something else'))).toBe('unknown');
    expect(provider.classifyError('string error')).toBe('unknown');
    expect(provider.classifyError(42)).toBe('unknown');
    expect(provider.classifyError({})).toBe('unknown');
  });

  it('returns a valid AIErrorCategory for all inputs', () => {
    const validCategories = new Set(['invalid', 'rate_limit', 'transient', 'malformed', 'network', 'unknown']);
    const inputs = [
      null, undefined, 42, 'string', {},
      { status: 200 }, { status: 400 }, { status: 429 }, { status: 500 },
      new Error('network error'), new SyntaxError('json'), new TypeError('Failed to fetch'),
    ];
    for (const input of inputs) {
      expect(validCategories.has(provider.classifyError(input))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Default / unknown scenario fallback
// ---------------------------------------------------------------------------

describe('MockProvider — unknown scenario falls back to happy-path', () => {
  it('generateQuestion returns valid shape for unknown scenario', async () => {
    const provider = new MockProvider({ scenario: 'nonexistent-scenario' });
    const result = await provider.generateQuestion(baseContext);
    const { valid } = validateQuestion(result);
    expect(valid).toBe(true);
  });
});
