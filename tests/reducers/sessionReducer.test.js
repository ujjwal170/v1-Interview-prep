/**
 * Tests for sessionReducer and buildSessionSummaryContext.
 *
 * Covers:
 *   - All FSM state transitions
 *   - All action handlers
 *   - Error / retry round-trips
 *   - buildSessionSummaryContext output shape
 *
 * Requirements: 4.1, 4.2, 6.2, 9.5, 17.3, 17.4
 */

import sessionReducer, {
  initialState,
  buildSessionSummaryContext,
  Actions,
} from '../../src/reducers/sessionReducer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatch(state, type, payload) {
  return sessionReducer(state, { type, payload });
}

const SAMPLE_QUESTION = {
  id: 'q1',
  text: 'What is a closure?',
  subtopic: 'closures',
  difficulty: 5,
};

const SAMPLE_EVALUATION = {
  score: 7,
  strengths: 'Good explanation',
  gaps: 'Missing examples',
  modelAnswer: 'A closure is...',
};

// ---------------------------------------------------------------------------
// initialState
// ---------------------------------------------------------------------------

describe('initialState', () => {
  test('has status idle', () => {
    expect(initialState.status).toBe('idle');
  });

  test('has expected shape', () => {
    expect(initialState).toMatchObject({
      status: 'idle',
      sessionId: null,
      topicId: null,
      topicName: null,
      difficultyIntent: 'adaptive',
      targetLength: 10,
      freeTextInstruction: '',
      taxonomy: [],
      questionsAsked: 0,
      subtopicsCovered: [],
      recentScores: [],
      weakestSubtopic: null,
      activeQuestion: null,
      submittedAnswer: null,
      currentDraft: '',
      evaluation: null,
      ignoredSubtopics: [],
      focusSubtopic: null,
      error: null,
      lastAction: null,
    });
  });

  test('reducer returns initialState for unknown action', () => {
    const result = sessionReducer(undefined, { type: '__UNKNOWN__' });
    expect(result).toEqual(initialState);
  });
});

// ---------------------------------------------------------------------------
// START_CONFIG
// ---------------------------------------------------------------------------

describe('START_CONFIG', () => {
  test('transitions to bootstrapping_taxonomy when hasTaxonomy is false', () => {
    const state = dispatch(initialState, Actions.START_CONFIG, {
      sessionId: 's1',
      topicId: 't1',
      topicName: 'JavaScript',
      difficultyIntent: 'adaptive',
      targetLength: 10,
      freeTextInstruction: '',
      taxonomy: [],
      hasTaxonomy: false,
    });
    expect(state.status).toBe('bootstrapping_taxonomy');
    expect(state.sessionId).toBe('s1');
    expect(state.topicName).toBe('JavaScript');
  });

  test('transitions to generating_question when hasTaxonomy is true', () => {
    const state = dispatch(initialState, Actions.START_CONFIG, {
      sessionId: 's1',
      topicId: 't1',
      topicName: 'JavaScript',
      difficultyIntent: 'adaptive',
      targetLength: 10,
      freeTextInstruction: '',
      taxonomy: ['closures', 'promises'],
      hasTaxonomy: true,
    });
    expect(state.status).toBe('generating_question');
    expect(state.taxonomy).toEqual(['closures', 'promises']);
  });

  test('clears error on START_CONFIG', () => {
    const errorState = { ...initialState, error: { category: 'network', lastAction: 'REQUEST_QUESTION' } };
    const state = dispatch(errorState, Actions.START_CONFIG, {
      sessionId: 's1', topicId: 't1', topicName: 'JS', hasTaxonomy: true,
    });
    expect(state.error).toBeNull();
  });

  test('sets lastAction to START_CONFIG', () => {
    const state = dispatch(initialState, Actions.START_CONFIG, {
      sessionId: 's1', topicId: 't1', topicName: 'JS', hasTaxonomy: false,
    });
    expect(state.lastAction).toBe(Actions.START_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// SUBMIT_CONFIG
// ---------------------------------------------------------------------------

describe('SUBMIT_CONFIG', () => {
  test('transitions to generating_question when taxonomy exists', () => {
    const base = { ...initialState, taxonomy: ['hooks', 'state'] };
    const state = dispatch(base, Actions.SUBMIT_CONFIG, { sessionId: 's2' });
    expect(state.status).toBe('generating_question');
    expect(state.sessionId).toBe('s2');
  });

  test('transitions to bootstrapping_taxonomy when taxonomy is empty', () => {
    const state = dispatch(initialState, Actions.SUBMIT_CONFIG, { sessionId: 's2' });
    expect(state.status).toBe('bootstrapping_taxonomy');
  });
});

// ---------------------------------------------------------------------------
// RECEIVE_TAXONOMY_SUGGESTIONS
// ---------------------------------------------------------------------------

describe('RECEIVE_TAXONOMY_SUGGESTIONS', () => {
  test('transitions to confirming_subtopics and sets taxonomy', () => {
    const base = { ...initialState, status: 'bootstrapping_taxonomy' };
    const state = dispatch(base, Actions.RECEIVE_TAXONOMY_SUGGESTIONS, {
      subtopics: ['hooks', 'context', 'state'],
    });
    expect(state.status).toBe('confirming_subtopics');
    expect(state.taxonomy).toEqual(['hooks', 'context', 'state']);
  });
});

// ---------------------------------------------------------------------------
// CONFIRM_TAXONOMY
// ---------------------------------------------------------------------------

describe('CONFIRM_TAXONOMY', () => {
  test('transitions to generating_question and sets taxonomy', () => {
    const base = { ...initialState, status: 'confirming_subtopics' };
    const state = dispatch(base, Actions.CONFIRM_TAXONOMY, {
      subtopics: ['hooks', 'context'],
    });
    expect(state.status).toBe('generating_question');
    expect(state.taxonomy).toEqual(['hooks', 'context']);
    expect(state.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// REQUEST_QUESTION
// ---------------------------------------------------------------------------

describe('REQUEST_QUESTION', () => {
  test('transitions to generating_question', () => {
    const base = { ...initialState, status: 'showing_evaluation' };
    const state = dispatch(base, Actions.REQUEST_QUESTION, undefined);
    expect(state.status).toBe('generating_question');
    expect(state.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RECEIVE_QUESTION
// ---------------------------------------------------------------------------

describe('RECEIVE_QUESTION', () => {
  test('transitions to awaiting_answer and sets activeQuestion', () => {
    const base = { ...initialState, status: 'generating_question' };
    const state = dispatch(base, Actions.RECEIVE_QUESTION, { question: SAMPLE_QUESTION });
    expect(state.status).toBe('awaiting_answer');
    expect(state.activeQuestion).toEqual(SAMPLE_QUESTION);
  });

  test('resets currentDraft to empty string', () => {
    const base = { ...initialState, status: 'generating_question', currentDraft: 'old draft' };
    const state = dispatch(base, Actions.RECEIVE_QUESTION, { question: SAMPLE_QUESTION });
    expect(state.currentDraft).toBe('');
  });
});

// ---------------------------------------------------------------------------
// UPDATE_DRAFT
// ---------------------------------------------------------------------------

describe('UPDATE_DRAFT', () => {
  test('updates currentDraft without changing status', () => {
    const base = { ...initialState, status: 'awaiting_answer' };
    const state = dispatch(base, Actions.UPDATE_DRAFT, { text: 'my answer draft' });
    expect(state.currentDraft).toBe('my answer draft');
    expect(state.status).toBe('awaiting_answer');
  });

  test('does not change lastAction', () => {
    const base = { ...initialState, lastAction: Actions.RECEIVE_QUESTION };
    const state = dispatch(base, Actions.UPDATE_DRAFT, { text: 'draft' });
    // UPDATE_DRAFT intentionally does not set lastAction
    expect(state.lastAction).toBe(Actions.RECEIVE_QUESTION);
  });
});

// ---------------------------------------------------------------------------
// SUBMIT_ANSWER
// ---------------------------------------------------------------------------

describe('SUBMIT_ANSWER', () => {
  test('transitions to evaluating and sets submittedAnswer', () => {
    const base = { ...initialState, status: 'awaiting_answer' };
    const state = dispatch(base, Actions.SUBMIT_ANSWER, { answer: 'My answer text' });
    expect(state.status).toBe('evaluating');
    expect(state.submittedAnswer).toBe('My answer text');
  });
});

// ---------------------------------------------------------------------------
// RECEIVE_EVALUATION
// ---------------------------------------------------------------------------

describe('RECEIVE_EVALUATION', () => {
  test('transitions to showing_evaluation', () => {
    const base = {
      ...initialState,
      status: 'evaluating',
      activeQuestion: SAMPLE_QUESTION,
      questionsAsked: 0,
    };
    const state = dispatch(base, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 7,
    });
    expect(state.status).toBe('showing_evaluation');
    expect(state.evaluation).toEqual(SAMPLE_EVALUATION);
  });

  test('increments questionsAsked', () => {
    const base = {
      ...initialState,
      status: 'evaluating',
      activeQuestion: SAMPLE_QUESTION,
      questionsAsked: 2,
    };
    const state = dispatch(base, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 7,
    });
    expect(state.questionsAsked).toBe(3);
  });

  test('appends score to recentScores', () => {
    const base = {
      ...initialState,
      status: 'evaluating',
      activeQuestion: SAMPLE_QUESTION,
      recentScores: [5, 6],
    };
    const state = dispatch(base, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 8,
    });
    expect(state.recentScores).toEqual([5, 6, 8]);
  });

  test('keeps only last 5 scores', () => {
    const base = {
      ...initialState,
      status: 'evaluating',
      activeQuestion: SAMPLE_QUESTION,
      recentScores: [1, 2, 3, 4, 5],
    };
    const state = dispatch(base, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 9,
    });
    expect(state.recentScores).toEqual([2, 3, 4, 5, 9]);
    expect(state.recentScores.length).toBe(5);
  });

  test('adds subtopic to subtopicsCovered', () => {
    const base = {
      ...initialState,
      status: 'evaluating',
      activeQuestion: SAMPLE_QUESTION, // subtopic: 'closures'
      subtopicsCovered: ['hooks'],
    };
    const state = dispatch(base, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 7,
    });
    expect(state.subtopicsCovered).toEqual(['hooks', 'closures']);
  });

  test('does not add subtopic when activeQuestion is null', () => {
    const base = {
      ...initialState,
      status: 'evaluating',
      activeQuestion: null,
      subtopicsCovered: ['hooks'],
    };
    const state = dispatch(base, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 7,
    });
    expect(state.subtopicsCovered).toEqual(['hooks']);
  });
});

// ---------------------------------------------------------------------------
// NEXT_QUESTION
// ---------------------------------------------------------------------------

describe('NEXT_QUESTION', () => {
  test('transitions to completed when questionsAsked >= targetLength', () => {
    const base = {
      ...initialState,
      status: 'showing_evaluation',
      questionsAsked: 10,
      targetLength: 10,
    };
    const state = dispatch(base, Actions.NEXT_QUESTION, undefined);
    expect(state.status).toBe('completed');
  });

  test('transitions to generating_question when more questions remain', () => {
    const base = {
      ...initialState,
      status: 'showing_evaluation',
      questionsAsked: 5,
      targetLength: 10,
      activeQuestion: SAMPLE_QUESTION,
      evaluation: SAMPLE_EVALUATION,
      submittedAnswer: 'some answer',
      currentDraft: 'draft',
    };
    const state = dispatch(base, Actions.NEXT_QUESTION, undefined);
    expect(state.status).toBe('generating_question');
    expect(state.activeQuestion).toBeNull();
    expect(state.evaluation).toBeNull();
    expect(state.submittedAnswer).toBeNull();
    expect(state.currentDraft).toBe('');
  });

  test('clears error when transitioning to generating_question', () => {
    const base = {
      ...initialState,
      status: 'showing_evaluation',
      questionsAsked: 3,
      targetLength: 10,
      error: { category: 'transient', lastAction: 'REQUEST_QUESTION' },
    };
    const state = dispatch(base, Actions.NEXT_QUESTION, undefined);
    expect(state.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// END_SESSION
// ---------------------------------------------------------------------------

describe('END_SESSION', () => {
  test('transitions to completed regardless of questionsAsked', () => {
    const base = { ...initialState, status: 'awaiting_answer', questionsAsked: 2 };
    const state = dispatch(base, Actions.END_SESSION, undefined);
    expect(state.status).toBe('completed');
  });

  test('transitions to completed from showing_evaluation', () => {
    const base = { ...initialState, status: 'showing_evaluation', questionsAsked: 5 };
    const state = dispatch(base, Actions.END_SESSION, undefined);
    expect(state.status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// ERROR
// ---------------------------------------------------------------------------

describe('ERROR', () => {
  test('transitions to error status', () => {
    const base = { ...initialState, status: 'generating_question' };
    const state = dispatch(base, Actions.ERROR, {
      category: 'network',
      lastAction: Actions.REQUEST_QUESTION,
    });
    expect(state.status).toBe('error');
    expect(state.error).toEqual({
      category: 'network',
      lastAction: Actions.REQUEST_QUESTION,
    });
  });

  test('defaults category to unknown when not provided', () => {
    const state = dispatch(initialState, Actions.ERROR, {});
    expect(state.error.category).toBe('unknown');
  });

  test('uses state.lastAction when lastAction not in payload', () => {
    const base = { ...initialState, lastAction: Actions.SUBMIT_ANSWER };
    const state = dispatch(base, Actions.ERROR, { category: 'transient' });
    expect(state.error.lastAction).toBe(Actions.SUBMIT_ANSWER);
  });
});

// ---------------------------------------------------------------------------
// RETRY
// ---------------------------------------------------------------------------

describe('RETRY', () => {
  test('resumes generating_question when lastAction was REQUEST_QUESTION', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'network', lastAction: Actions.REQUEST_QUESTION },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.status).toBe('generating_question');
    expect(state.error).toBeNull();
  });

  test('resumes evaluating when lastAction was SUBMIT_ANSWER', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'transient', lastAction: Actions.SUBMIT_ANSWER },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.status).toBe('evaluating');
    expect(state.error).toBeNull();
  });

  test('resumes evaluating when lastAction was RECEIVE_EVALUATION', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'malformed', lastAction: Actions.RECEIVE_EVALUATION },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.status).toBe('evaluating');
  });

  test('resumes bootstrapping_taxonomy when lastAction was START_CONFIG (no taxonomy)', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'network', lastAction: Actions.START_CONFIG },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.status).toBe('bootstrapping_taxonomy');
  });

  test('resumes bootstrapping_taxonomy when lastAction was RECEIVE_TAXONOMY_SUGGESTIONS', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'malformed', lastAction: Actions.RECEIVE_TAXONOMY_SUGGESTIONS },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.status).toBe('bootstrapping_taxonomy');
  });

  test('defaults to generating_question for unknown lastAction', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'unknown', lastAction: null },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.status).toBe('generating_question');
  });

  test('sets lastAction to RETRY', () => {
    const base = {
      ...initialState,
      status: 'error',
      error: { category: 'network', lastAction: Actions.REQUEST_QUESTION },
    };
    const state = dispatch(base, Actions.RETRY, undefined);
    expect(state.lastAction).toBe(Actions.RETRY);
  });
});

// ---------------------------------------------------------------------------
// IGNORE_SUBTOPIC
// ---------------------------------------------------------------------------

describe('IGNORE_SUBTOPIC', () => {
  test('adds subtopic to ignoredSubtopics', () => {
    const state = dispatch(initialState, Actions.IGNORE_SUBTOPIC, { subtopic: 'closures' });
    expect(state.ignoredSubtopics).toContain('closures');
  });

  test('does not add duplicate subtopics', () => {
    const base = { ...initialState, ignoredSubtopics: ['closures'] };
    const state = dispatch(base, Actions.IGNORE_SUBTOPIC, { subtopic: 'closures' });
    expect(state.ignoredSubtopics).toEqual(['closures']);
  });

  test('returns same state when subtopic is empty', () => {
    const state = dispatch(initialState, Actions.IGNORE_SUBTOPIC, { subtopic: '' });
    expect(state).toBe(initialState);
  });
});

// ---------------------------------------------------------------------------
// FOCUS_SUBTOPIC
// ---------------------------------------------------------------------------

describe('FOCUS_SUBTOPIC', () => {
  test('sets focusSubtopic', () => {
    const state = dispatch(initialState, Actions.FOCUS_SUBTOPIC, { subtopic: 'hooks' });
    expect(state.focusSubtopic).toBe('hooks');
  });

  test('clears focusSubtopic when payload subtopic is null', () => {
    const base = { ...initialState, focusSubtopic: 'hooks' };
    const state = dispatch(base, Actions.FOCUS_SUBTOPIC, { subtopic: null });
    expect(state.focusSubtopic).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ADD_SUBTOPIC
// ---------------------------------------------------------------------------

describe('ADD_SUBTOPIC', () => {
  test('adds subtopic to taxonomy', () => {
    const base = { ...initialState, taxonomy: ['hooks'] };
    const state = dispatch(base, Actions.ADD_SUBTOPIC, { subtopic: 'context' });
    expect(state.taxonomy).toEqual(['hooks', 'context']);
  });

  test('does not add duplicate subtopics', () => {
    const base = { ...initialState, taxonomy: ['hooks'] };
    const state = dispatch(base, Actions.ADD_SUBTOPIC, { subtopic: 'hooks' });
    expect(state.taxonomy).toEqual(['hooks']);
  });

  test('returns same state when subtopic is empty', () => {
    const state = dispatch(initialState, Actions.ADD_SUBTOPIC, { subtopic: '' });
    expect(state).toBe(initialState);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_INSTRUCTION
// ---------------------------------------------------------------------------

describe('UPDATE_INSTRUCTION', () => {
  test('updates freeTextInstruction', () => {
    const state = dispatch(initialState, Actions.UPDATE_INSTRUCTION, {
      instruction: 'Focus on async patterns',
    });
    expect(state.freeTextInstruction).toBe('Focus on async patterns');
  });

  test('does not change status', () => {
    const base = { ...initialState, status: 'awaiting_answer' };
    const state = dispatch(base, Actions.UPDATE_INSTRUCTION, { instruction: 'new instruction' });
    expect(state.status).toBe('awaiting_answer');
  });
});

// ---------------------------------------------------------------------------
// Error / Retry round-trip
// ---------------------------------------------------------------------------

describe('Error / Retry round-trip', () => {
  test('preserves submittedAnswer across error and retry (evaluating path)', () => {
    // Start from awaiting_answer, submit answer
    let state = dispatch(
      { ...initialState, status: 'awaiting_answer', activeQuestion: SAMPLE_QUESTION },
      Actions.SUBMIT_ANSWER,
      { answer: 'My detailed answer' }
    );
    expect(state.submittedAnswer).toBe('My detailed answer');

    // Error occurs during evaluation
    state = dispatch(state, Actions.ERROR, {
      category: 'transient',
      lastAction: Actions.SUBMIT_ANSWER,
    });
    expect(state.status).toBe('error');
    expect(state.submittedAnswer).toBe('My detailed answer'); // preserved

    // Retry resumes evaluating
    state = dispatch(state, Actions.RETRY, undefined);
    expect(state.status).toBe('evaluating');
    expect(state.submittedAnswer).toBe('My detailed answer'); // still preserved
  });

  test('full happy path: idle → generating_question → awaiting_answer → evaluating → showing_evaluation → completed', () => {
    let state = initialState;

    // Start with existing taxonomy
    state = dispatch(state, Actions.START_CONFIG, {
      sessionId: 's1',
      topicId: 't1',
      topicName: 'JavaScript',
      difficultyIntent: 'adaptive',
      targetLength: 2,
      freeTextInstruction: '',
      taxonomy: ['closures', 'promises'],
      hasTaxonomy: true,
    });
    expect(state.status).toBe('generating_question');

    // Receive question
    state = dispatch(state, Actions.RECEIVE_QUESTION, { question: SAMPLE_QUESTION });
    expect(state.status).toBe('awaiting_answer');

    // Submit answer
    state = dispatch(state, Actions.SUBMIT_ANSWER, { answer: 'answer text' });
    expect(state.status).toBe('evaluating');

    // Receive evaluation (questionsAsked becomes 1)
    state = dispatch(state, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 7,
    });
    expect(state.status).toBe('showing_evaluation');
    expect(state.questionsAsked).toBe(1);

    // Next question (1 < 2, so generating_question)
    state = dispatch(state, Actions.NEXT_QUESTION, undefined);
    expect(state.status).toBe('generating_question');

    // Receive second question
    const q2 = { id: 'q2', text: 'Explain promises', subtopic: 'promises', difficulty: 6 };
    state = dispatch(state, Actions.RECEIVE_QUESTION, { question: q2 });
    state = dispatch(state, Actions.SUBMIT_ANSWER, { answer: 'answer 2' });
    state = dispatch(state, Actions.RECEIVE_EVALUATION, {
      evaluation: SAMPLE_EVALUATION,
      score: 8,
    });
    expect(state.questionsAsked).toBe(2);

    // Next question (2 >= 2, so completed)
    state = dispatch(state, Actions.NEXT_QUESTION, undefined);
    expect(state.status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// buildSessionSummaryContext
// ---------------------------------------------------------------------------

describe('buildSessionSummaryContext', () => {
  test('returns correct shape', () => {
    const state = {
      ...initialState,
      topicName: 'JavaScript',
      questionsAsked: 3,
      subtopicsCovered: ['hooks', 'closures', 'promises'],
      recentScores: [5, 6, 7],
      weakestSubtopic: 'closures',
      ignoredSubtopics: ['ssr'],
      focusSubtopic: 'hooks',
      freeTextInstruction: 'Focus on async',
      taxonomy: ['hooks', 'closures', 'promises', 'ssr'],
    };

    const ctx = buildSessionSummaryContext(state);

    expect(ctx).toMatchObject({
      topic: 'JavaScript',
      difficultyTarget: 5,
      questionsAsked: 3,
      subtopicsCovered: ['hooks', 'closures', 'promises'],
      recentScores: [5, 6, 7],
      weakestSubtopic: 'closures',
      focusSubtopic: 'hooks',
      freeTextInstruction: 'Focus on async',
      taxonomy: ['hooks', 'closures', 'promises', 'ssr'],
    });
  });

  test('avoidSubtopics combines ignoredSubtopics and last 3 subtopicsCovered', () => {
    const state = {
      ...initialState,
      ignoredSubtopics: ['ssr'],
      subtopicsCovered: ['hooks', 'closures', 'promises', 'context'],
    };

    const ctx = buildSessionSummaryContext(state);
    // last 3 of subtopicsCovered: ['closures', 'promises', 'context']
    expect(ctx.avoidSubtopics).toEqual(['ssr', 'closures', 'promises', 'context']);
  });

  test('recentScores is capped at last 5', () => {
    const state = {
      ...initialState,
      recentScores: [1, 2, 3, 4, 5, 6, 7],
    };
    const ctx = buildSessionSummaryContext(state);
    expect(ctx.recentScores).toEqual([3, 4, 5, 6, 7]);
    expect(ctx.recentScores.length).toBe(5);
  });

  test('difficultyTarget defaults to 5', () => {
    const ctx = buildSessionSummaryContext(initialState);
    expect(ctx.difficultyTarget).toBe(5);
  });

  test('avoidSubtopics is empty when no ignored and no covered', () => {
    const ctx = buildSessionSummaryContext(initialState);
    expect(ctx.avoidSubtopics).toEqual([]);
  });

  test('does not mutate state', () => {
    const state = {
      ...initialState,
      recentScores: [1, 2, 3, 4, 5],
      subtopicsCovered: ['a', 'b', 'c'],
    };
    buildSessionSummaryContext(state);
    expect(state.recentScores).toEqual([1, 2, 3, 4, 5]);
    expect(state.subtopicsCovered).toEqual(['a', 'b', 'c']);
  });
});
