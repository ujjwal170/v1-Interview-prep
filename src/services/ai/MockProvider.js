import { AIProvider } from './AIProvider.js';

/**
 * Returns the active mock scenario by reading (in priority order):
 *   1. `?mock=<scenario>` URL query parameter
 *   2. `VITE_MOCK_SCENARIO` environment variable
 *   3. Default: `'happy-path'`
 *
 * @returns {string}
 */
export function getScenario() {
  try {
    const urlParam =
      typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).get('mock')
        : null;
    if (urlParam) return urlParam;
  } catch (_) {
    // ignore – window may not be available in test environments
  }

  // In Vite (browser/SSR), read from import.meta.env.
  // In Jest/Node (CommonJS), import.meta is not available so we fall back to
  // process.env which Jest can populate via testEnvironmentOptions or dotenv.
  try {
    // eslint-disable-next-line no-new-func
    const envVar = new Function('return (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env.VITE_MOCK_SCENARIO : undefined')();
    if (envVar) return envVar;
  } catch (_) {
    // ignore – import.meta may not be available in all environments
  }

  // Fallback for Jest / Node environments
  try {
    const envVar = typeof process !== 'undefined' ? process.env.VITE_MOCK_SCENARIO : undefined;
    if (envVar) return envVar;
  } catch (_) {
    // ignore
  }

  return 'happy-path';
}

// ---------------------------------------------------------------------------
// Canned subtopic lists keyed by lower-cased topic name
// ---------------------------------------------------------------------------
const CANNED_SUBTOPICS = {
  react: [
    'hooks',
    'state management',
    'context',
    'lifecycle',
    'performance',
    'error boundaries',
    'testing',
    'forms',
    'routing',
    'ssr',
    'suspense',
    'accessibility',
  ],
  javascript: [
    'closures',
    'prototypes',
    'async/await',
    'event loop',
    'promises',
    'modules',
    'scope',
    'this keyword',
    'destructuring',
    'generators',
    'proxies',
    'error handling',
  ],
  typescript: [
    'types vs interfaces',
    'generics',
    'utility types',
    'decorators',
    'enums',
    'type narrowing',
    'mapped types',
    'conditional types',
    'declaration merging',
    'module augmentation',
    'strict mode',
    'type guards',
  ],
  css: [
    'flexbox',
    'grid',
    'specificity',
    'animations',
    'variables',
    'pseudo-elements',
    'media queries',
    'positioning',
    'box model',
    'selectors',
    'preprocessors',
    'responsive design',
  ],
  node: [
    'event loop',
    'streams',
    'modules',
    'file system',
    'http module',
    'child processes',
    'cluster',
    'buffers',
    'error handling',
    'middleware',
    'authentication',
    'performance',
  ],
};

const GENERIC_SUBTOPICS = [
  'fundamentals',
  'advanced concepts',
  'best practices',
  'design patterns',
  'testing',
  'performance',
  'security',
  'tooling',
  'debugging',
  'architecture',
  'integration',
  'deployment',
];

/**
 * Returns 12 canned subtopics for the given topic name.
 * Falls back to generic subtopics for unknown topics.
 *
 * @param {string} topicName
 * @returns {string[]}
 */
function getCannedSubtopics(topicName) {
  const key = (topicName || '').toLowerCase().trim();
  return CANNED_SUBTOPICS[key] ?? GENERIC_SUBTOPICS;
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Happy-path response builders
// ---------------------------------------------------------------------------

/**
 * @param {import('./AIProvider.js').SessionSummaryContext} context
 * @returns {import('./AIProvider.js').GeneratedQuestion}
 */
function happyQuestion(context) {
  return {
    question: 'What is a closure in JavaScript?',
    subtopic: context.chosenSubtopic,
    difficulty: context.difficultyTarget,
  };
}

/**
 * @param {string} _question  (unused but kept for signature parity)
 * @param {string} answer
 * @returns {import('./AIProvider.js').GeneratedEvaluation}
 */
function happyEvaluation(_question, answer) {
  const score = Math.min(10, Math.max(0, Math.floor((answer?.length ?? 0) / 20) + 3));
  return {
    score,
    strengths: 'Good attempt.',
    gaps: 'Could be more detailed.',
    modelAnswer:
      'A closure is a function that retains access to its outer scope.',
  };
}

/**
 * @param {string} topicName
 * @returns {string[]}
 */
function happySubtopics(topicName) {
  return getCannedSubtopics(topicName);
}

// ---------------------------------------------------------------------------
// MockProvider
// ---------------------------------------------------------------------------

/**
 * Deterministic, scenario-driven AI provider for development and Demo Mode.
 *
 * Supported scenarios:
 *   - `happy-path`    — deterministic valid responses
 *   - `slow`          — 1–2 s delay then happy-path responses
 *   - `malformed-json`— responses that intentionally fail schema validators
 *   - `rate-limit`    — throws `{ status: 429, message: 'rate limited' }`
 *   - `network-fail`  — rejects with `new Error('network error')`
 */
export class MockProvider extends AIProvider {
  /**
   * @param {{ scenario?: string }} [options]
   */
  constructor({ scenario } = {}) {
    super();
    this.scenario = scenario ?? 'happy-path';
  }

  // -------------------------------------------------------------------------
  // generateQuestion
  // -------------------------------------------------------------------------

  /**
   * @param {import('./AIProvider.js').SessionSummaryContext} context
   * @returns {Promise<import('./AIProvider.js').GeneratedQuestion>}
   */
  async generateQuestion(context) {
    switch (this.scenario) {
      case 'happy-path':
        return happyQuestion(context);

      case 'slow': {
        const delay = 1000 + Math.random() * 1000; // 1000–2000 ms
        await sleep(delay);
        return happyQuestion(context);
      }

      case 'malformed-json':
        // Missing `subtopic` field — fails validateQuestion
        return {
          question: 'What is a closure in JavaScript?',
          // subtopic intentionally omitted
          difficulty: context.difficultyTarget ?? 5,
        };

      case 'rate-limit':
        throw { status: 429, message: 'rate limited' };

      case 'network-fail':
        throw new Error('network error');

      default:
        return happyQuestion(context);
    }
  }

  // -------------------------------------------------------------------------
  // evaluateAnswer
  // -------------------------------------------------------------------------

  /**
   * @param {string} question
   * @param {string} answer
   * @returns {Promise<import('./AIProvider.js').GeneratedEvaluation>}
   */
  async evaluateAnswer(question, answer) {
    switch (this.scenario) {
      case 'happy-path':
        return happyEvaluation(question, answer);

      case 'slow': {
        const delay = 1000 + Math.random() * 1000;
        await sleep(delay);
        return happyEvaluation(question, answer);
      }

      case 'malformed-json':
        // score outside [0, 10] — fails validateEvaluation
        return {
          score: -1,
          strengths: 'Good attempt.',
          gaps: 'Could be more detailed.',
          modelAnswer:
            'A closure is a function that retains access to its outer scope.',
        };

      case 'rate-limit':
        throw { status: 429, message: 'rate limited' };

      case 'network-fail':
        throw new Error('network error');

      default:
        return happyEvaluation(question, answer);
    }
  }

  // -------------------------------------------------------------------------
  // suggestSubtopics
  // -------------------------------------------------------------------------

  /**
   * @param {string} topicName
   * @returns {Promise<string[]>}
   */
  async suggestSubtopics(topicName) {
    switch (this.scenario) {
      case 'happy-path':
        return happySubtopics(topicName);

      case 'slow': {
        const delay = 1000 + Math.random() * 1000;
        await sleep(delay);
        return happySubtopics(topicName);
      }

      case 'malformed-json':
        // Array containing a non-string — fails validateSubtopics
        return ['hooks', 42, 'context', null, 'lifecycle'];

      case 'rate-limit':
        throw { status: 429, message: 'rate limited' };

      case 'network-fail':
        throw new Error('network error');

      default:
        return happySubtopics(topicName);
    }
  }

  // -------------------------------------------------------------------------
  // classifyError
  // -------------------------------------------------------------------------

  /**
   * Classify an error into a known category.
   *
   * Rules (evaluated in order):
   *   1. `err?.status === 429`                          → `'rate_limit'`
   *   2. `err?.status >= 400 && err?.status < 500`      → `'invalid'`
   *   3. `err?.status >= 500`                           → `'transient'`
   *   4. fetch/network failure (no status)              → `'transient'`
   *   5. JSON parse failure                             → `'malformed'`
   *   6. `err instanceof Error && message includes 'network'` → `'network'`
   *   7. otherwise                                      → `'unknown'`
   *
   * @param {unknown} err
   * @returns {import('./AIProvider.js').AIErrorCategory}
   */
  classifyError(err) {
    if (err?.status === 429) return 'rate_limit';

    if (typeof err?.status === 'number') {
      if (err.status >= 400 && err.status < 500) return 'invalid';
      if (err.status >= 500) return 'transient';
    }

    // Fetch / network-level failure (TypeError from fetch, no status)
    if (
      err instanceof TypeError &&
      (err.message.toLowerCase().includes('failed to fetch') ||
        err.message.toLowerCase().includes('network'))
    ) {
      return 'transient';
    }

    // JSON parse failure
    if (err instanceof SyntaxError) return 'malformed';

    // Generic network error
    if (err instanceof Error && err.message.toLowerCase().includes('network')) {
      return 'network';
    }

    return 'unknown';
  }
}
