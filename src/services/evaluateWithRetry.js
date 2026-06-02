/**
 * evaluateWithRetry — bounded retry wrapper around `aiProvider.evaluateAnswer`.
 *
 * Retry strategy (3 total attempts):
 *   - Schema-validation failures ('malformed') → retry. The model sometimes
 *     returns a malformed JSON response that succeeds on the next attempt.
 *   - Transient failures ('rate_limit', 'transient', 'network') → retry with
 *     a short backoff. The provider's internal model rotation handles these
 *     within a single call, but a final failure can still surface to us
 *     (e.g. all 5 models simultaneously 429). One more attempt with a small
 *     pause often clears it.
 *   - Other errors ('invalid', 'unknown') → fail immediately. These won't
 *     improve on retry against the same input.
 *
 * Throws an Error whose `category` field is set to one of
 * 'malformed' | 'rate_limit' | 'transient' | 'invalid' | 'network' | 'unknown'.
 *
 * Used by:
 *   - SessionRunPage per-question 'evaluating' state
 *   - SessionRunPage background streaming evaluations (end_of_session mode)
 *   - SessionSummaryPage retry button for failed evaluations
 *
 * @module services/evaluateWithRetry
 */

import { validateEvaluation } from './schemaValidator.js';

/** Initial attempt + 2 retries = 3 total attempts (Req 17.3) */
export const MAX_ATTEMPTS = 3;

/** Categories that warrant another retry on the same input. */
const RETRYABLE_CATEGORIES = new Set([
  'malformed',
  'rate_limit',
  'transient',
  'network',
]);

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {{
 *   evaluateAnswer: (q: string, a: string) => Promise<any>,
 *   classifyError?: (err: unknown) => string,
 * }} aiProvider
 * @param {string} questionText
 * @param {string} answerText
 * @returns {Promise<{ score: number, strengths: string, gaps: string, modelAnswer: string }>}
 */
export async function evaluateWithRetry(aiProvider, questionText, answerText) {
  let lastError = null;
  let lastCategory = 'unknown';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await aiProvider.evaluateAnswer(questionText, answerText);
      const { valid } = validateEvaluation(raw);

      if (!valid) {
        lastError = Object.assign(new Error('malformed evaluation'), {
          category: 'malformed',
        });
        lastCategory = 'malformed';
        // Retry on malformed (next iteration of the loop)
      } else {
        return {
          score: raw.score,
          strengths: raw.strengths,
          gaps: raw.gaps,
          modelAnswer: raw.modelAnswer,
        };
      }
    } catch (err) {
      lastError = err;
      lastCategory =
        err?.category ?? aiProvider.classifyError?.(err) ?? 'unknown';
      if (!RETRYABLE_CATEGORIES.has(lastCategory)) break;
    }

    // Short backoff before the next attempt to avoid hammering the provider.
    // 0ms before attempt 1, 400ms before attempt 2, 1000ms before attempt 3.
    if (attempt < MAX_ATTEMPTS - 1) {
      const delays = [400, 1000];
      await sleep(delays[attempt] ?? 1000);
    }
  }

  throw Object.assign(
    new Error(lastError?.message ?? 'evaluation failed'),
    { category: lastCategory, cause: lastError },
  );
}
