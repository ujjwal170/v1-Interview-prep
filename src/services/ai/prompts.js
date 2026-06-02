export function questionGenPrompt(ctx, chosenSubtopic) {
  return `You are an interview coach generating ONE question for the topic "${ctx.topic}".
Difficulty target: ${ctx.difficultyTarget}/10.
${ctx.freeTextInstruction ? `IMPORTANT USER CONSTRAINT: ${ctx.freeTextInstruction}. You MUST follow this instruction when generating the question. If this conflicts with the selected subtopic, prioritize the user's instruction.` : ''}
Selected subtopic: ${chosenSubtopic}.
${ctx.freeTextInstruction ? `Generate the question for the selected subtopic, but the user's instruction above takes priority if there is a conflict.` : `Generate the question ONLY for the selected subtopic.`}

Questions asked so far: ${ctx.questionsAsked}.
Subtopics already covered: ${ctx.subtopicsCovered.join(', ') || 'none'}.
Recent scores: ${ctx.recentScores.join(', ') || 'none'}.
Avoid these phrasings or duplicates: ${ctx.avoidSubtopics.join(', ') || 'none'}.
${ctx.previousQuestions && ctx.previousQuestions.length > 0
  ? `\nCRITICAL: The following questions on the subtopic "${chosenSubtopic}" have already been asked in this session. Do NOT generate a question that is the same as or similar to any of them. Do NOT paraphrase, rephrase, or ask a slightly different version of any listed question:\n${ctx.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\nThe new question MUST test a substantively different concept, scenario, or angle within "${chosenSubtopic}".\n`
  : ''}
Return ONLY valid JSON in this exact shape:
{ "question": string, "subtopic": string, "difficulty": integer 1..10 }

The "subtopic" field in the response MUST equal "${chosenSubtopic}". The "difficulty" field SHOULD equal ${ctx.difficultyTarget}.

Example:
{ "question": "Explain the difference between useMemo and useCallback.", "subtopic": "hooks", "difficulty": 6 }`;
}

export function evaluationPrompt(question, answer) {
  return `You are evaluating a single interview answer.

Question:
${question}

Answer:
${answer || '(empty)'}

Rubric:
- 0–2: irrelevant or wrong
- 3–4: partial understanding, major gaps
- 5–6: solid baseline, minor gaps
- 7–8: strong, well-reasoned
- 9–10: expert-level, complete

Return ONLY valid JSON in this exact shape:
{ "score": integer 0..10, "strengths": string, "gaps": string, "modelAnswer": string }

Strengths, gaps, and modelAnswer must each be non-empty.`;
}

export function subtopicSuggestionPrompt(topicName) {
  return `Suggest 10 distinct subtopics for the interview topic "${topicName}".
Return ONLY valid JSON: an array of exactly 10 short lowercase strings.

Example for "React":
["hooks","state management","context","lifecycle","performance","error boundaries","testing","forms","routing","ssr"]`;
}
