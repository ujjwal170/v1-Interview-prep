import { GeminiProvider } from '../../../src/services/ai/GeminiProvider.js';
import { AIProvider } from '../../../src/services/ai/AIProvider.js';

// Mock @google/generative-ai so tests don't make real network calls
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  const MockGoogleGenerativeAI = jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    _mockGenerateContent: mockGenerateContent,
    _mockGetGenerativeModel: mockGetGenerativeModel,
  };
});

const { GoogleGenerativeAI, _mockGenerateContent } = require('@google/generative-ai');

/**
 * Helper: make generateContent resolve with a JSON string (optionally wrapped in fences).
 */
function mockResponse(obj, { fenced = false, fenceType = 'json' } = {}) {
  const json = JSON.stringify(obj);
  const text = fenced
    ? fenceType
      ? `\`\`\`${fenceType}\n${json}\n\`\`\``
      : `\`\`\`\n${json}\n\`\`\``
    : json;
  _mockGenerateContent.mockResolvedValueOnce({
    response: { text: () => text },
  });
}

describe('GeminiProvider', () => {
  let provider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GeminiProvider({ apiKey: 'test-api-key' });
  });

  // ── Construction ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('extends AIProvider', () => {
      expect(provider).toBeInstanceOf(AIProvider);
    });

    it('stores the apiKey', () => {
      expect(provider.apiKey).toBe('test-api-key');
    });
  });

  // ── generateQuestion ──────────────────────────────────────────────────────

  describe('generateQuestion', () => {
    const context = {
      topic: 'React',
      difficultyTarget: 5,
      questionsAsked: 2,
      subtopicsCovered: ['hooks'],
      recentScores: [7, 8],
      weakestSubtopic: null,
      avoidSubtopics: [],
      focusSubtopic: null,
      freeTextInstruction: '',
      taxonomy: ['hooks', 'state management', 'context'],
    };

    it('returns parsed question object from plain JSON response', async () => {
      const expected = { question: 'What is useEffect?', subtopic: 'hooks', difficulty: 5 };
      mockResponse(expected);

      const result = await provider.generateQuestion(context);
      expect(result).toEqual(expected);
    });

    it('strips ```json fences before parsing', async () => {
      const expected = { question: 'Explain useState.', subtopic: 'hooks', difficulty: 4 };
      mockResponse(expected, { fenced: true, fenceType: 'json' });

      const result = await provider.generateQuestion(context);
      expect(result).toEqual(expected);
    });

    it('strips plain ``` fences before parsing', async () => {
      const expected = { question: 'What is context?', subtopic: 'context', difficulty: 6 };
      mockResponse(expected, { fenced: true, fenceType: '' });

      const result = await provider.generateQuestion(context);
      expect(result).toEqual(expected);
    });

    it('uses the first taxonomy entry as chosenSubtopic', async () => {
      const expected = { question: 'Explain hooks.', subtopic: 'hooks', difficulty: 5 };
      mockResponse(expected);

      await provider.generateQuestion(context);

      // The prompt passed to generateContent should mention the first subtopic
      const callArg = _mockGenerateContent.mock.calls[0][0];
      expect(callArg).toContain('hooks');
    });

    it('falls back to "general" when taxonomy is empty', async () => {
      const ctxNoTaxonomy = { ...context, taxonomy: [] };
      const expected = { question: 'General question?', subtopic: 'general', difficulty: 5 };
      mockResponse(expected);

      await provider.generateQuestion(ctxNoTaxonomy);

      const callArg = _mockGenerateContent.mock.calls[0][0];
      expect(callArg).toContain('general');
    });

    it('creates a fresh GoogleGenerativeAI client on each call (reads apiKey fresh)', async () => {
      mockResponse({ question: 'Q1', subtopic: 'hooks', difficulty: 5 });
      mockResponse({ question: 'Q2', subtopic: 'hooks', difficulty: 5 });

      await provider.generateQuestion(context);
      provider.apiKey = 'new-api-key';
      await provider.generateQuestion(context);

      expect(GoogleGenerativeAI).toHaveBeenCalledTimes(2);
      expect(GoogleGenerativeAI).toHaveBeenNthCalledWith(1, 'test-api-key');
      expect(GoogleGenerativeAI).toHaveBeenNthCalledWith(2, 'new-api-key');
    });

    it('uses the gemini-3.5-flash model by default', async () => {
      const { _mockGetGenerativeModel } = require('@google/generative-ai');
      mockResponse({ question: 'Q', subtopic: 'hooks', difficulty: 5 });

      await provider.generateQuestion(context);

      expect(_mockGetGenerativeModel).toHaveBeenCalledWith(
        { model: 'gemini-3.5-flash' },
        { apiVersion: 'v1' }
      );
    });

    it('throws SyntaxError when response is not valid JSON', async () => {
      _mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => 'not valid json {{{' },
      });

      await expect(provider.generateQuestion(context)).rejects.toThrow(SyntaxError);
    });
  });

  // ── evaluateAnswer ────────────────────────────────────────────────────────

  describe('evaluateAnswer', () => {
    it('returns parsed evaluation object', async () => {
      const expected = {
        score: 8,
        strengths: 'Good explanation',
        gaps: 'Missing edge cases',
        modelAnswer: 'A complete answer...',
      };
      mockResponse(expected);

      const result = await provider.evaluateAnswer('What is React?', 'React is a library.');
      expect(result).toEqual(expected);
    });

    it('strips markdown fences from evaluation response', async () => {
      const expected = { score: 6, strengths: 'OK', gaps: 'Some gaps', modelAnswer: 'Better answer' };
      mockResponse(expected, { fenced: true, fenceType: 'json' });

      const result = await provider.evaluateAnswer('Q', 'A');
      expect(result).toEqual(expected);
    });

    it('throws SyntaxError when response is not valid JSON', async () => {
      _mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => 'invalid' },
      });

      await expect(provider.evaluateAnswer('Q', 'A')).rejects.toThrow(SyntaxError);
    });
  });

  // ── suggestSubtopics ──────────────────────────────────────────────────────

  describe('suggestSubtopics', () => {
    it('returns parsed array of subtopics', async () => {
      const expected = ['hooks', 'state management', 'context', 'lifecycle',
        'performance', 'error boundaries', 'testing', 'forms',
        'routing', 'ssr', 'suspense', 'accessibility'];
      mockResponse(expected);

      const result = await provider.suggestSubtopics('React');
      expect(result).toEqual(expected);
    });

    it('strips markdown fences from subtopics response', async () => {
      const expected = ['hooks', 'state'];
      mockResponse(expected, { fenced: true, fenceType: 'json' });

      const result = await provider.suggestSubtopics('React');
      expect(result).toEqual(expected);
    });
  });

  // ── classifyError ─────────────────────────────────────────────────────────

  describe('classifyError', () => {
    it('returns "malformed" for SyntaxError', () => {
      expect(provider.classifyError(new SyntaxError('Unexpected token'))).toBe('malformed');
    });

    it('returns "rate_limit" for HTTP 429 on err.status', () => {
      expect(provider.classifyError({ status: 429 })).toBe('rate_limit');
    });

    it('returns "rate_limit" for HTTP 429 on err.response.status', () => {
      expect(provider.classifyError({ response: { status: 429 } })).toBe('rate_limit');
    });

    it('returns "invalid" for HTTP 400', () => {
      expect(provider.classifyError({ status: 400 })).toBe('invalid');
    });

    it('returns "invalid" for HTTP 401', () => {
      expect(provider.classifyError({ status: 401 })).toBe('invalid');
    });

    it('returns "invalid" for HTTP 403', () => {
      expect(provider.classifyError({ status: 403 })).toBe('invalid');
    });

    it('returns "invalid" for HTTP 404', () => {
      expect(provider.classifyError({ status: 404 })).toBe('invalid');
    });

    it('returns "invalid" for HTTP 499', () => {
      expect(provider.classifyError({ status: 499 })).toBe('invalid');
    });

    it('returns "transient" for HTTP 500', () => {
      expect(provider.classifyError({ status: 500 })).toBe('transient');
    });

    it('returns "transient" for HTTP 503', () => {
      expect(provider.classifyError({ status: 503 })).toBe('transient');
    });

    it('returns "transient" for TypeError (network/fetch error)', () => {
      expect(provider.classifyError(new TypeError('Failed to fetch'))).toBe('transient');
    });

    it('returns "transient" for Error with "network" in message', () => {
      expect(provider.classifyError(new Error('network error'))).toBe('transient');
    });

    it('returns "transient" for Error with "fetch" in message', () => {
      expect(provider.classifyError(new Error('fetch failed'))).toBe('transient');
    });

    it('returns "unknown" for a generic Error', () => {
      expect(provider.classifyError(new Error('something went wrong'))).toBe('unknown');
    });

    it('returns "unknown" for null', () => {
      expect(provider.classifyError(null)).toBe('unknown');
    });

    it('returns "unknown" for undefined', () => {
      expect(provider.classifyError(undefined)).toBe('unknown');
    });

    it('returns "unknown" for a plain object with no status', () => {
      expect(provider.classifyError({ message: 'oops' })).toBe('unknown');
    });

    it('returns "invalid" for 4xx via err.response.status', () => {
      expect(provider.classifyError({ response: { status: 403 } })).toBe('invalid');
    });

    it('returns "transient" for 5xx via err.response.status', () => {
      expect(provider.classifyError({ response: { status: 502 } })).toBe('transient');
    });

    it('err.status takes precedence over err.response.status', () => {
      // err.status is 429, response.status is 500 — should be rate_limit
      expect(provider.classifyError({ status: 429, response: { status: 500 } })).toBe('rate_limit');
    });
  });
});
