import { GoogleGenerativeAI } from '@google/generative-ai';

// Use stable v1 API instead of the default v1beta
const GEMINI_API_VERSION = 'v1';
import { AIProvider } from './AIProvider.js';
import {
  questionGenPrompt,
  evaluationPrompt,
  subtopicSuggestionPrompt,
} from './prompts.js';

/**
 * Fallback chain ordered by speed first, then intelligence.
 * gemini-3.1-flash-lite leads for lowest latency on free tier.
 * gemini-3.5-flash is kept but with thinking disabled (see _sendPrompt).
 */
const FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemma-4-31b-it',
  'gemma-4-26b-it',
];

/**
 * Returns true if the error is a 429 / RESOURCE_EXHAUSTED rate-limit error.
 * The Gemini SDK surfaces this in multiple ways.
 * @param {unknown} err
 * @returns {boolean}
 */
function is429(err) {
  if (!err) return false;
  if (err?.status === 429) return true;
  const msg = err?.message ?? '';
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
}

/**
 * Returns true if the error is retryable (but NOT a 429).
 * Covers 5xx server errors, network/fetch failures, and timeouts.
 * Does NOT include 4xx client errors (other than 429) or JSON parse failures.
 * @param {unknown} err
 * @returns {boolean}
 */
function isRetryable(err) {
  if (!err) return false;

  // 5xx server errors
  const status = err?.status ?? err?.response?.status;
  if (typeof status === 'number' && status >= 500) return true;

  // Network / fetch failures (TypeError from fetch, or message containing network/fetch)
  if (err instanceof TypeError) return true;
  if (
    err instanceof Error &&
    (err.message?.toLowerCase().includes('network') ||
      err.message?.toLowerCase().includes('fetch') ||
      err.message?.toLowerCase().includes('failed to fetch') ||
      err.message?.toLowerCase().includes('timeout') ||
      err.message?.toLowerCase().includes('econnrefused'))
  ) {
    return true;
  }

  return false;
}

/**
 * Strips Markdown JSON fences from a string and extracts the first valid
 * JSON value (object or array) when the model prepends conversational text.
 *
 * Handles:
 *  - ```json ... ``` and ``` ... ``` wrappers
 *  - Responses where the model echoes the prompt or adds preamble before
 *    the JSON (multi-part responses that get concatenated by the SDK)
 *
 * @param {string} text
 * @returns {string}
 */
function stripMarkdownFences(text) {
  let cleaned = text.trim();

  // 1. Strip explicit ```json ... ``` or ``` ... ``` fences
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // 2. If the result still doesn't start with { or [, find the first
  //    occurrence of a JSON object or array and extract from there.
  //    This handles multi-part responses where the model prepends preamble.
  if (cleaned.length > 0 && cleaned[0] !== '{' && cleaned[0] !== '[') {
    const objStart = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');

    let jsonStart = -1;
    if (objStart === -1) jsonStart = arrStart;
    else if (arrStart === -1) jsonStart = objStart;
    else jsonStart = Math.min(objStart, arrStart);

    if (jsonStart !== -1) {
      cleaned = cleaned.slice(jsonStart).trim();
    }
  }

  return cleaned;
}

/**
 * GeminiProvider wraps @google/generative-ai to implement the AIProvider interface.
 * The API key is read fresh on each call so key changes are picked up without
 * needing to recreate the provider instance.
 *
 * Model selection uses a round-robin fallback chain: if the current model
 * returns 429, the provider rotates to the next model and retries. The last
 * successful model index is remembered so subsequent calls start from there,
 * skipping models that are known to be at quota.
 */
export class GeminiProvider extends AIProvider {
  /**
   * @param {{ apiKey: string }} options
   */
  constructor({ apiKey }) {
    super();
    this.apiKey = apiKey;
    /** Index into FALLBACK_MODELS for the next call. Sticky on success. */
    this.currentModelIndex = 0;
    /** Tracks the last index set by a 429 rotation (or initial). */
    this._lastStickyIndex = 0;
  }

  /**
   * Sends a prompt using the fallback model chain.
   *
   * Rotation strategy:
   *  - On 429 (rate limit): rotate to the next model AND make it sticky
   *    (i.e. future calls start from the new model).
   *  - On any other retryable error (5xx, network, etc.) OR a SyntaxError
   *    (malformed JSON the SDK or our stripFences couldn't recover from):
   *    rotate to the next model but do NOT update the sticky index. If a
   *    subsequent model succeeds, revert `currentModelIndex` back to the
   *    last sticky model so the next call resumes from there. JSON parse
   *    failures are treated as model-specific glitches worth trying another
   *    model for, not permanent failures.
   *  - On non-retryable errors (4xx other than 429, invalid key): throw
   *    immediately without rotation.
   *
   * @param {string} prompt
   * @returns {Promise<unknown>}
   */
  async _sendPrompt(prompt) {
    const totalModels = FALLBACK_MODELS.length;
    let attempts = 0;
    let lastError = null;

    // Working index tracks which model to try next within this call.
    // _lastStickyIndex (instance field) remembers the preferred model across calls.
    let workingIndex = this.currentModelIndex;

    while (attempts < totalModels) {
      const modelName = FALLBACK_MODELS[workingIndex];
      console.warn(`[GeminiProvider] Using model: ${modelName}`);

      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);

        // Disable thinking mode on gemini-3.5-flash to avoid the extra
        // internal reasoning latency (~10s+). Other models don't support
        // this config and will ignore it.
        const model = genAI.getGenerativeModel(
          { model: modelName },
          { apiVersion: GEMINI_API_VERSION }
        );
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = stripMarkdownFences(text);
        const parsed = JSON.parse(cleaned);

        // Success — revert to the last sticky index. If 429 rotations happened
        // during this call, _lastStickyIndex was updated to the new sticky
        // position. If only non-429 rotations happened, _lastStickyIndex still
        // points to the original preferred model.
        this.currentModelIndex = this._lastStickyIndex;

        return parsed;
      } catch (err) {
        if (is429(err)) {
          // 429: rotate AND make sticky
          console.warn(
            `[GeminiProvider] ${modelName} hit rate limit (429), rotating to next model (sticky)`
          );
          lastError = err;
          workingIndex = (workingIndex + 1) % totalModels;
          this.currentModelIndex = workingIndex;
          this._lastStickyIndex = workingIndex;
          attempts++;
        } else if (isRetryable(err) || err instanceof SyntaxError) {
          // 5xx / network → temporary rotation
          // SyntaxError (malformed JSON) → also rotate, model-specific issue
          // Neither updates the sticky position — only 429 does.
          const reason = err instanceof SyntaxError
            ? 'malformed JSON response'
            : 'retryable error';
          console.warn(
            `[GeminiProvider] ${modelName} hit ${reason}, rotating to next model (non-sticky):`,
            err?.message ?? err
          );
          lastError = err;
          workingIndex = (workingIndex + 1) % totalModels;
          attempts++;
        } else {
          // Non-retryable error (4xx other than 429, invalid key, etc.)
          console.error('[GeminiProvider] Non-retryable error:', err?.message ?? err);
          throw err;
        }
      }
    }

    // All models exhausted — throw the last error
    console.error('[GeminiProvider] All models exhausted');
    throw lastError;
  }

  /**
   * Generate a question based on the current session context.
   * @param {import('./AIProvider.js').SessionSummaryContext} context
   * @returns {Promise<import('./AIProvider.js').GeneratedQuestion>}
   */
  async generateQuestion(context) {
    // Prefer the explicit chosenSubtopic the caller selected via the adaptive
    // selector. Falls back to the first taxonomy entry only if none provided
    // (legacy callers).
    const chosenSubtopic =
      context.chosenSubtopic ||
      (context.taxonomy && context.taxonomy[0]) ||
      'general';
    const prompt = questionGenPrompt(context, chosenSubtopic);
    return this._sendPrompt(prompt);
  }

  /**
   * Evaluate a submitted answer for a given question.
   * @param {string} question
   * @param {string} answer
   * @returns {Promise<import('./AIProvider.js').GeneratedEvaluation>}
   */
  async evaluateAnswer(question, answer) {
    const prompt = evaluationPrompt(question, answer);
    return this._sendPrompt(prompt);
  }

  /**
   * Suggest approximately 12 subtopics for a given topic name.
   * @param {string} topicName
   * @returns {Promise<string[]>}
   */
  async suggestSubtopics(topicName) {
    const prompt = subtopicSuggestionPrompt(topicName);
    return this._sendPrompt(prompt);
  }

  /**
   * Classify an error into a known category.
   * @param {unknown} err
   * @returns {import('./AIProvider.js').AIErrorCategory}
   */
  classifyError(err) {
    // JSON parse failures
    if (err instanceof SyntaxError) {
      return 'malformed';
    }

    // HTTP status from the error object itself or a nested response
    const status = err?.status ?? err?.response?.status;

    if (status === 429) {
      return 'rate_limit';
    }

    if (typeof status === 'number') {
      if (status >= 400 && status < 500) {
        return 'invalid';
      }
      if (status >= 500) {
        return 'transient';
      }
    }

    // Network / fetch errors (no status code, or TypeError from fetch)
    if (
      err instanceof TypeError ||
      (err instanceof Error &&
        (err.message?.toLowerCase().includes('network') ||
          err.message?.toLowerCase().includes('fetch') ||
          err.message?.toLowerCase().includes('failed to fetch')))
    ) {
      return 'transient';
    }

    return 'unknown';
  }
}
