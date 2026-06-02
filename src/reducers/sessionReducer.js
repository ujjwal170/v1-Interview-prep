/**
 * Session Reducer — finite state machine for the interview session run page.
 *
 * States (9 total):
 *   idle → bootstrapping_taxonomy → confirming_subtopics
 *   → generating_question → awaiting_answer → evaluating → showing_evaluation
 *   → completed | error
 *
 * All state transitions are pure; side effects (DB writes, AI calls) are
 * handled by the page component that owns this reducer.
 *
 * @module sessionReducer
 */

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/** @type {SessionState} */
export const initialState = {
  status: 'idle',
  sessionId: null,
  topicId: null,
  topicName: null,
  difficultyIntent: 'adaptive',
  targetLength: 10,
  freeTextInstruction: '',
  taxonomy: [],           // array of subtopic name strings
  lastSelected: [],       // user's previous subtopic selection (for modal pre-check)
  questionsAsked: 0,
  subtopicsCovered: [],
  recentScores: [],       // last 5 scores
  previousQuestions: [],  // [{ text, subtopic }] — every question asked this session
  activeQuestion: null,   // { id, text, subtopic, difficulty }
  submittedAnswer: null,  // preserved across error round-trips
  evaluation: null,
  error: null,            // { category, lastAction }
  lastAction: null,
};

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const Actions = {
  START_CONFIG: 'START_CONFIG',
  RECEIVE_TAXONOMY_SUGGESTIONS: 'RECEIVE_TAXONOMY_SUGGESTIONS',
  CONFIRM_TAXONOMY: 'CONFIRM_TAXONOMY',
  REQUEST_QUESTION: 'REQUEST_QUESTION',
  RECEIVE_QUESTION: 'RECEIVE_QUESTION',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  RECEIVE_EVALUATION: 'RECEIVE_EVALUATION',
  NEXT_QUESTION: 'NEXT_QUESTION',
  END_SESSION: 'END_SESSION',
  ERROR: 'ERROR',
  RETRY: 'RETRY',
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Session finite state machine reducer.
 *
 * @param {SessionState} state
 * @param {{ type: string, payload?: any }} action
 * @returns {SessionState}
 */
function sessionReducer(state = initialState, action) {
  switch (action.type) {

    // -----------------------------------------------------------------------
    // START_CONFIG
    // Payload: { sessionId, topicId, topicName, difficultyIntent, targetLength,
    //            freeTextInstruction, taxonomy, hasTaxonomy }
    // Always passes hasTaxonomy: false to force bootstrapping_taxonomy so the
    // subtopic modal always opens at session start.
    // -----------------------------------------------------------------------
    case Actions.START_CONFIG: {
      const {
        sessionId,
        topicId,
        topicName,
        difficultyIntent = 'adaptive',
        targetLength = 10,
        freeTextInstruction = '',
        taxonomy = [],
        lastSelected = [],
        hasTaxonomy = false,
      } = action.payload || {};

      return {
        ...state,
        status: hasTaxonomy ? 'generating_question' : 'bootstrapping_taxonomy',
        sessionId,
        topicId,
        topicName,
        difficultyIntent,
        targetLength,
        freeTextInstruction,
        taxonomy,
        lastSelected,
        lastAction: Actions.START_CONFIG,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // RECEIVE_TAXONOMY_SUGGESTIONS
    // Payload: { subtopics }
    // -----------------------------------------------------------------------
    case Actions.RECEIVE_TAXONOMY_SUGGESTIONS: {
      return {
        ...state,
        status: 'confirming_subtopics',
        taxonomy: action.payload?.subtopics ?? state.taxonomy,
        lastAction: Actions.RECEIVE_TAXONOMY_SUGGESTIONS,
      };
    }

    // -----------------------------------------------------------------------
    // CONFIRM_TAXONOMY
    // Payload: { subtopics }
    // -----------------------------------------------------------------------
    case Actions.CONFIRM_TAXONOMY: {
      return {
        ...state,
        status: 'generating_question',
        taxonomy: action.payload?.subtopics ?? state.taxonomy,
        lastAction: Actions.CONFIRM_TAXONOMY,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // REQUEST_QUESTION
    // -----------------------------------------------------------------------
    case Actions.REQUEST_QUESTION: {
      return {
        ...state,
        status: 'generating_question',
        lastAction: Actions.REQUEST_QUESTION,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // RECEIVE_QUESTION
    // Payload: { question } — shape: { id, text, subtopic, difficulty }
    // -----------------------------------------------------------------------
    case Actions.RECEIVE_QUESTION: {
      const newQuestion = action.payload?.question;
      const updatedPrevious = [
        ...state.previousQuestions,
        { text: newQuestion.text, subtopic: newQuestion.subtopic },
      ];
      return {
        ...state,
        status: 'awaiting_answer',
        activeQuestion: newQuestion ?? state.activeQuestion,
        previousQuestions: updatedPrevious,
        lastAction: Actions.RECEIVE_QUESTION,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // SUBMIT_ANSWER
    // Payload: { answer }
    // Always → 'evaluating'; save submittedAnswer.
    // -----------------------------------------------------------------------
    case Actions.SUBMIT_ANSWER: {
      return {
        ...state,
        status: 'evaluating',
        submittedAnswer: action.payload?.answer ?? state.submittedAnswer,
        lastAction: Actions.SUBMIT_ANSWER,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // RECEIVE_EVALUATION
    // Payload: { evaluation, score }
    // -----------------------------------------------------------------------
    case Actions.RECEIVE_EVALUATION: {
      const { evaluation, score } = action.payload || {};
      const updatedScores = [...state.recentScores, score].slice(-5);

      const subtopic = state.activeQuestion?.subtopic;
      const updatedSubtopicsCovered = subtopic
        ? [...state.subtopicsCovered, subtopic]
        : state.subtopicsCovered;

      return {
        ...state,
        status: 'showing_evaluation',
        evaluation: evaluation ?? state.evaluation,
        recentScores: updatedScores,
        questionsAsked: state.questionsAsked + 1,
        subtopicsCovered: updatedSubtopicsCovered,
        lastAction: Actions.RECEIVE_EVALUATION,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // NEXT_QUESTION
    // If questionsAsked >= targetLength → completed
    // Else → generating_question, clear activeQuestion/evaluation/submittedAnswer
    // -----------------------------------------------------------------------
    case Actions.NEXT_QUESTION: {
      if (state.questionsAsked >= state.targetLength) {
        return {
          ...state,
          status: 'completed',
          lastAction: Actions.NEXT_QUESTION,
        };
      }
      return {
        ...state,
        status: 'generating_question',
        activeQuestion: null,
        evaluation: null,
        submittedAnswer: null,
        lastAction: Actions.NEXT_QUESTION,
        error: null,
      };
    }

    // -----------------------------------------------------------------------
    // END_SESSION
    // Always transitions to 'completed'.
    // -----------------------------------------------------------------------
    case Actions.END_SESSION: {
      return {
        ...state,
        status: 'completed',
        lastAction: Actions.END_SESSION,
      };
    }

    // -----------------------------------------------------------------------
    // ERROR
    // Payload: { category, lastAction }
    // -----------------------------------------------------------------------
    case Actions.ERROR: {
      const { category, lastAction } = action.payload || {};
      return {
        ...state,
        status: 'error',
        error: {
          category: category ?? 'unknown',
          lastAction: lastAction ?? state.lastAction,
        },
        lastAction: Actions.ERROR,
      };
    }

    // -----------------------------------------------------------------------
    // RETRY
    // Resume the appropriate state based on state.error.lastAction.
    // -----------------------------------------------------------------------
    case Actions.RETRY: {
      const failedAction = state.error?.lastAction;

      let resumeStatus;
      if (
        failedAction === Actions.REQUEST_QUESTION ||
        failedAction === Actions.RECEIVE_QUESTION ||
        failedAction === Actions.CONFIRM_TAXONOMY
      ) {
        resumeStatus = 'generating_question';
      } else if (
        failedAction === Actions.SUBMIT_ANSWER ||
        failedAction === Actions.RECEIVE_EVALUATION
      ) {
        resumeStatus = 'evaluating';
      } else if (
        failedAction === Actions.START_CONFIG ||
        failedAction === Actions.RECEIVE_TAXONOMY_SUGGESTIONS
      ) {
        resumeStatus = 'bootstrapping_taxonomy';
      } else {
        resumeStatus = 'generating_question';
      }

      return {
        ...state,
        status: resumeStatus,
        error: null,
        lastAction: Actions.RETRY,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// buildSessionSummaryContext
// ---------------------------------------------------------------------------

/**
 * Build the fixed-size Session_Summary_Context object consumed by the AI
 * provider's `generateQuestion` call.
 *
 * @param {SessionState} state - Current session reducer state.
 * @returns {SessionSummaryContext}
 */
export function buildSessionSummaryContext(state) {
  return {
    topic: state.topicName,
    difficultyTarget: 5, // computed by caller using adaptiveSelector; 5 is the default
    questionsAsked: state.questionsAsked,
    subtopicsCovered: state.subtopicsCovered,
    recentScores: state.recentScores.slice(-5),
    // Last 5 covered → strong hint to the AI not to repeat them.
    avoidSubtopics: state.subtopicsCovered.slice(-5),
    freeTextInstruction: state.freeTextInstruction,
    taxonomy: state.taxonomy,
  };
}

export default sessionReducer;
