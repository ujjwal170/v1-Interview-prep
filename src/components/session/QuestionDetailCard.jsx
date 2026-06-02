/**
 * QuestionDetailCard
 *
 * Renders a single question with its answer and AI evaluation. Used on the
 * Session Summary page (post-session review) and the History Detail page
 * (revisiting older sessions). Tolerates either field name for the question
 * body (`text` is the canonical field; `question` is the legacy one).
 */

import MarkdownRenderer from '../MarkdownRenderer.jsx';
import Card from '../Card.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score) {
  if (score >= 7) return 'text-emerald-600';
  if (score >= 5) return 'text-amber-500';
  return 'text-red-500';
}

function difficultyBadge(difficulty) {
  if (difficulty == null) {
    return { label: 'Unknown', className: 'bg-gray-100 text-gray-600' };
  }
  if (difficulty <= 3) {
    return {
      label: `Easy (${difficulty})`,
      className: 'bg-emerald-100 text-emerald-700',
    };
  }
  if (difficulty <= 6) {
    return {
      label: `Medium (${difficulty})`,
      className: 'bg-amber-100 text-amber-700',
    };
  }
  return {
    label: `Hard (${difficulty})`,
    className: 'bg-red-100 text-red-700',
  };
}

function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @param {{ question: Object, index: number }} props
 */
export default function QuestionDetailCard({ question, index }) {
  const { label: diffLabel, className: diffClass } = difficultyBadge(
    question.difficulty,
  );
  const evaluation = question.evaluation;
  const answer = question.answer;
  const questionText = question.text ?? question.question ?? '';

  return (
    <Card className="space-y-4">
      {/* ── Question header ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide">
          Q{index + 1}
        </span>
        {question.subtopic && (
          <Badge className="bg-[var(--accent)]/10 text-[var(--accent)]">
            {question.subtopic}
          </Badge>
        )}
        <Badge className={diffClass}>{diffLabel}</Badge>
      </div>

      {/* ── Question text ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide mb-1">
          Question
        </p>
        <MarkdownRenderer className="prose prose-sm max-w-none text-[var(--text-h)] [&_code]:bg-[var(--code-bg)] [&_pre]:bg-[var(--code-bg)]">
          {questionText}
        </MarkdownRenderer>
      </div>

      {/* ── Answer ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide mb-1">
          Answer
        </p>
        {answer ? (
          <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
            {answer}
          </p>
        ) : (
          <p className="text-sm text-[var(--text)] italic opacity-60">
            No answer submitted
          </p>
        )}
      </div>

      {/* ── Evaluation ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide mb-2">
          Evaluation
        </p>
        {evaluation ? (
          <div className="space-y-3 border-t border-[var(--border)] pt-3">
            {/* Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text)]">Score:</span>
              <span
                className={`text-lg font-bold ${scoreColor(evaluation.score)}`}
                aria-label={`Score: ${evaluation.score} out of 10`}
              >
                {evaluation.score}
                <span className="text-sm font-normal text-[var(--text)] ml-0.5">
                  / 10
                </span>
              </span>
            </div>

            {evaluation.strengths && (
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  ✓ Strengths
                </p>
                <MarkdownRenderer className="prose prose-sm max-w-none text-[var(--text)] [&_code]:bg-[var(--code-bg)] [&_pre]:bg-[var(--code-bg)]">
                  {evaluation.strengths}
                </MarkdownRenderer>
              </div>
            )}

            {evaluation.gaps && (
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                  △ Gaps
                </p>
                <MarkdownRenderer className="prose prose-sm max-w-none text-[var(--text)] [&_code]:bg-[var(--code-bg)] [&_pre]:bg-[var(--code-bg)]">
                  {evaluation.gaps}
                </MarkdownRenderer>
              </div>
            )}

            {evaluation.modelAnswer && (
              <div>
                <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-1">
                  ★ Model Answer
                </p>
                <MarkdownRenderer className="prose prose-sm max-w-none text-[var(--text)] [&_code]:bg-[var(--code-bg)] [&_pre]:bg-[var(--code-bg)]">
                  {evaluation.modelAnswer}
                </MarkdownRenderer>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text)] italic opacity-60">
            Not evaluated
          </p>
        )}
      </div>
    </Card>
  );
}
