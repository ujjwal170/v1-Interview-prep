/**
 * @typedef {Object} SessionSummaryContext
 * @property {string} topic
 * @property {number} difficultyTarget
 * @property {number} questionsAsked
 * @property {string[]} subtopicsCovered
 * @property {string[]} previousQuestions    // prior question texts for the chosen subtopic this session
 * @property {number[]} recentScores         // up to 5
 * @property {string[]} avoidSubtopics       // recently seen
 * @property {string} freeTextInstruction
 * @property {string[]} taxonomy             // allowed subtopic names
 */

/**
 * @typedef {Object} GeneratedQuestion
 * @property {string} question
 * @property {string} subtopic
 * @property {number} difficulty   // integer 1..10
 */

/**
 * @typedef {Object} GeneratedEvaluation
 * @property {number} score        // integer 0..10
 * @property {string} strengths
 * @property {string} gaps
 * @property {string} modelAnswer
 */

/**
 * @typedef {'invalid'|'rate_limit'|'transient'|'malformed'|'network'|'unknown'} AIErrorCategory
 */

/**
 * Abstract base class for AI providers.
 * Concrete implementations (MockProvider, GeminiProvider) extend this class.
 */
export class AIProvider {
  /**
   * Generate a question based on the current session context.
   * @param {SessionSummaryContext} context
   * @returns {Promise<GeneratedQuestion>}
   */
  async generateQuestion(context) { throw new Error('not implemented'); }

  /**
   * Evaluate a submitted answer for a given question.
   * @param {string} question
   * @param {string} answer
   * @returns {Promise<GeneratedEvaluation>}
   */
  async evaluateAnswer(question, answer) { throw new Error('not implemented'); }

  /**
   * Suggest approximately 12 subtopics for a given topic name.
   * @param {string} topicName
   * @returns {Promise<string[]>}
   */
  async suggestSubtopics(topicName) { throw new Error('not implemented'); }

  /**
   * Classify an error into a known category.
   * @param {unknown} err
   * @returns {AIErrorCategory}
   */
  classifyError(err) { return 'unknown'; }
}
