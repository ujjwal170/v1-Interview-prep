import MarkdownRenderer from '../MarkdownRenderer';

/**
 * Difficulty badge color: low (1-3) green, mid (4-6) yellow, high (7-10) red.
 */
function difficultyColor(difficulty) {
  if (difficulty <= 3) return 'bg-green-100 text-green-800 border-green-200';
  if (difficulty <= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

/**
 * QuestionDisplay — renders the active interview question.
 *
 * Props:
 *   question        {{ text: string, subtopic: string, difficulty: number }}
 *   questionNumber  {number}  – optional 1-based index of the current question
 *   totalQuestions  {number}  – optional total question count for the session
 *
 * Requirements: 6.5, 13.1, 13.2
 */
export default function QuestionDisplay({ question, questionNumber, totalQuestions }) {
  if (!question) return null;

  const { text, subtopic, difficulty } = question;
  const showProgress = questionNumber != null && totalQuestions != null;

  return (
    <section
      aria-label="Interview question"
      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow)] p-6 text-left"
    >
      {/* Header row: progress counter + badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        {showProgress && (
          <span className="text-sm font-medium text-[var(--text)]">
            Question{' '}
            <span className="text-[var(--text-h)] font-semibold">{questionNumber}</span>
            {' / '}
            <span className="text-[var(--text-h)] font-semibold">{totalQuestions}</span>
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Subtopic badge */}
          {subtopic && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent)]">
              {subtopic}
            </span>
          )}

          {/* Difficulty badge */}
          {difficulty != null && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${difficultyColor(difficulty)}`}
              aria-label={`Difficulty ${difficulty} out of 10`}
            >
              Difficulty {difficulty}/10
            </span>
          )}
        </div>
      </div>

      {/* Question text rendered as Markdown (Req 13.1) */}
      <MarkdownRenderer className="prose prose-sm max-w-none text-[var(--text-h)] [&_code]:bg-[var(--code-bg)] [&_pre]:bg-[var(--code-bg)]">
        {text}
      </MarkdownRenderer>
    </section>
  );
}
