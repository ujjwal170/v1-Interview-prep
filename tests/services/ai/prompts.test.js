import {
  questionGenPrompt,
  evaluationPrompt,
  subtopicSuggestionPrompt,
} from '../../../src/services/ai/prompts.js';

describe('questionGenPrompt', () => {
  const baseCtx = {
    topic: 'React',
    difficultyTarget: 6,
    questionsAsked: 2,
    subtopicsCovered: ['hooks', 'state management'],
    recentScores: [7, 5],
    avoidSubtopics: ['lifecycle'],
    freeTextInstruction: 'Focus on practical examples',
  };

  it('includes the topic name', () => {
    const prompt = questionGenPrompt(baseCtx, 'hooks');
    expect(prompt).toContain('"React"');
  });

  it('includes the chosen subtopic', () => {
    const prompt = questionGenPrompt(baseCtx, 'hooks');
    expect(prompt).toContain('Selected subtopic: hooks');
    expect(prompt).toContain('The "subtopic" field in the response MUST equal "hooks"');
  });

  it('includes difficulty target', () => {
    const prompt = questionGenPrompt(baseCtx, 'hooks');
    expect(prompt).toContain('Difficulty target: 6/10');
    expect(prompt).toContain('The "difficulty" field SHOULD equal 6');
  });

  it('joins subtopicsCovered with comma', () => {
    const prompt = questionGenPrompt(baseCtx, 'hooks');
    expect(prompt).toContain('hooks, state management');
  });

  it('shows "none" when subtopicsCovered is empty', () => {
    const ctx = { ...baseCtx, subtopicsCovered: [] };
    const prompt = questionGenPrompt(ctx, 'hooks');
    expect(prompt).toContain('Subtopics already covered: none');
  });

  it('shows "none" when recentScores is empty', () => {
    const ctx = { ...baseCtx, recentScores: [] };
    const prompt = questionGenPrompt(ctx, 'hooks');
    expect(prompt).toContain('Recent scores: none');
  });

  it('shows "none" when avoidSubtopics is empty', () => {
    const ctx = { ...baseCtx, avoidSubtopics: [] };
    const prompt = questionGenPrompt(ctx, 'hooks');
    expect(prompt).toContain('Avoid these phrasings or duplicates: none');
  });

  it('shows "none" when freeTextInstruction is falsy', () => {
    const ctx = { ...baseCtx, freeTextInstruction: null };
    const prompt = questionGenPrompt(ctx, 'hooks');
    expect(prompt).toContain('User instruction: none');
  });

  it('includes the JSON shape instruction', () => {
    const prompt = questionGenPrompt(baseCtx, 'hooks');
    expect(prompt).toContain('Return ONLY valid JSON in this exact shape:');
    expect(prompt).toContain('"question": string, "subtopic": string, "difficulty": integer 1..10');
  });
});

describe('evaluationPrompt', () => {
  it('includes the question text', () => {
    const prompt = evaluationPrompt('What is a closure?', 'A function with access to outer scope.');
    expect(prompt).toContain('What is a closure?');
  });

  it('includes the answer text', () => {
    const prompt = evaluationPrompt('What is a closure?', 'A function with access to outer scope.');
    expect(prompt).toContain('A function with access to outer scope.');
  });

  it('shows "(empty)" when answer is falsy', () => {
    const prompt = evaluationPrompt('What is a closure?', '');
    expect(prompt).toContain('(empty)');
  });

  it('shows "(empty)" when answer is null', () => {
    const prompt = evaluationPrompt('What is a closure?', null);
    expect(prompt).toContain('(empty)');
  });

  it('includes the rubric', () => {
    const prompt = evaluationPrompt('Q', 'A');
    expect(prompt).toContain('0–2: irrelevant or wrong');
    expect(prompt).toContain('9–10: expert-level, complete');
  });

  it('includes the JSON shape instruction', () => {
    const prompt = evaluationPrompt('Q', 'A');
    expect(prompt).toContain('Return ONLY valid JSON in this exact shape:');
    expect(prompt).toContain('"score": integer 0..10, "strengths": string, "gaps": string, "modelAnswer": string');
  });

  it('requires non-empty strengths, gaps, and modelAnswer', () => {
    const prompt = evaluationPrompt('Q', 'A');
    expect(prompt).toContain('Strengths, gaps, and modelAnswer must each be non-empty.');
  });
});

describe('subtopicSuggestionPrompt', () => {
  it('includes the topic name', () => {
    const prompt = subtopicSuggestionPrompt('React');
    expect(prompt).toContain('"React"');
  });

  it('asks for exactly 12 subtopics', () => {
    const prompt = subtopicSuggestionPrompt('React');
    expect(prompt).toContain('12 distinct subtopics');
    expect(prompt).toContain('array of exactly 12 short lowercase strings');
  });

  it('includes the React example', () => {
    const prompt = subtopicSuggestionPrompt('React');
    expect(prompt).toContain('["hooks","state management","context"');
  });

  it('works with a different topic name', () => {
    const prompt = subtopicSuggestionPrompt('Node.js');
    // The topic name appears in the opening sentence
    expect(prompt).toContain('interview topic "Node.js"');
    // The React example block is always present as a hardcoded illustration
    expect(prompt).toContain('Example for "React"');
  });
});
