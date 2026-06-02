/**
 * Schema validators for AI provider responses.
 * All functions are total — they never throw and always return { valid: boolean, errors: string[] }.
 */

/**
 * Validates a question object returned by the AI provider.
 * Checks:
 *   - question: non-empty string
 *   - subtopic: non-empty string
 *   - difficulty: integer in [1, 10]
 *
 */
export function validateQuestion(obj) {
  try {
    const errors = [];

    if (obj === null || obj === undefined || typeof obj !== 'object' || Array.isArray(obj)) {
      errors.push('not an object');
      return { valid: false, errors };
    }

    if (typeof obj.question !== 'string' || obj.question.trim() === '') {
      errors.push('question missing or empty');
    }

    if (typeof obj.subtopic !== 'string' || obj.subtopic.trim() === '') {
      errors.push('subtopic missing or empty');
    }

    if (!Number.isInteger(obj.difficulty) || obj.difficulty < 1 || obj.difficulty > 10) {
      errors.push('difficulty must be an integer in [1, 10]');
    }

    return { valid: errors.length === 0, errors };
  } catch (_err) {
    return { valid: false, errors: ['unexpected validation error'] };
  }
}

/**
 * Validates an evaluation object returned by the AI provider.
 * Checks:
 *   - score: integer in [0, 10]
 *   - strengths: non-empty string
 *   - gaps: non-empty string
 *   - modelAnswer: non-empty string
 */
export function validateEvaluation(obj) {
  try {
    const errors = [];

    if (obj === null || obj === undefined || typeof obj !== 'object' || Array.isArray(obj)) {
      errors.push('not an object');
      return { valid: false, errors };
    }

    if (!Number.isInteger(obj.score) || obj.score < 0 || obj.score > 10) {
      errors.push('score must be an integer in [0, 10]');
    }

    if (typeof obj.strengths !== 'string' || obj.strengths.trim() === '') {
      errors.push('strengths missing or empty');
    }

    if (typeof obj.gaps !== 'string' || obj.gaps.trim() === '') {
      errors.push('gaps missing or empty');
    }

    if (typeof obj.modelAnswer !== 'string' || obj.modelAnswer.trim() === '') {
      errors.push('modelAnswer missing or empty');
    }

    return { valid: errors.length === 0, errors };
  } catch (_err) {
    return { valid: false, errors: ['unexpected validation error'] };
  }
}

/**
 * Validates a subtopics array returned by the AI provider.
 * Checks:
 *   - value is an array
 *   - length > 0
 *   - every element is a non-empty string
 */
export function validateSubtopics(arr) {
  try {
    const errors = [];

    if (!Array.isArray(arr)) {
      errors.push('not an array');
      return { valid: false, errors };
    }

    if (arr.length === 0) {
      errors.push('array must not be empty');
      return { valid: false, errors };
    }

    arr.forEach((item, index) => {
      if (typeof item !== 'string' || item.trim() === '') {
        errors.push(`item at index ${index} is not a non-empty string`);
      }
    });

    return { valid: errors.length === 0, errors };
  } catch (_err) {
    return { valid: false, errors: ['unexpected validation error'] };
  }
}
