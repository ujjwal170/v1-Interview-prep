import { AIProvider } from '../../../src/services/ai/AIProvider.js';

describe('AIProvider base class', () => {
  let provider;

  beforeEach(() => {
    provider = new AIProvider();
  });

  describe('generateQuestion', () => {
    it('throws "not implemented" when called on the base class', async () => {
      await expect(provider.generateQuestion({})).rejects.toThrow('not implemented');
    });
  });

  describe('evaluateAnswer', () => {
    it('throws "not implemented" when called on the base class', async () => {
      await expect(provider.evaluateAnswer('question', 'answer')).rejects.toThrow('not implemented');
    });
  });

  describe('suggestSubtopics', () => {
    it('throws "not implemented" when called on the base class', async () => {
      await expect(provider.suggestSubtopics('React')).rejects.toThrow('not implemented');
    });
  });

  describe('classifyError', () => {
    it('returns "unknown" by default', () => {
      expect(provider.classifyError(new Error('some error'))).toBe('unknown');
    });

    it('returns "unknown" for any error type', () => {
      expect(provider.classifyError(null)).toBe('unknown');
      expect(provider.classifyError(undefined)).toBe('unknown');
      expect(provider.classifyError({ status: 429 })).toBe('unknown');
      expect(provider.classifyError('string error')).toBe('unknown');
    });
  });

  describe('subclass extension', () => {
    it('allows subclasses to override methods', async () => {
      class ConcreteProvider extends AIProvider {
        async generateQuestion(context) {
          return { question: 'What is React?', subtopic: 'basics', difficulty: 5 };
        }
        classifyError(err) {
          if (err?.status === 429) return 'rate_limit';
          return 'unknown';
        }
      }

      const concrete = new ConcreteProvider();
      const result = await concrete.generateQuestion({});
      expect(result).toEqual({ question: 'What is React?', subtopic: 'basics', difficulty: 5 });
      expect(concrete.classifyError({ status: 429 })).toBe('rate_limit');
      // unoverridden methods still throw
      await expect(concrete.evaluateAnswer('q', 'a')).rejects.toThrow('not implemented');
      await expect(concrete.suggestSubtopics('React')).rejects.toThrow('not implemented');
    });
  });
});
