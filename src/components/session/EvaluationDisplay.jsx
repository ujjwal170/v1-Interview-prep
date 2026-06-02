import MarkdownRenderer from '../MarkdownRenderer';

/**
 * Returns Tailwind color classes for the score value.
 * red < 5, yellow 5-6, green >= 7
 */
function scoreColorClasses(score) {
  if (score >= 7) {
    return {
      ring: 'ring-green-400',
      text: 'text-green-600',
      bg: 'bg-green-50',
      label: 'text-green-700',
    };
  }
  if (score >= 5) {
    return {
      ring: 'ring-yellow-400',
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      label: 'text-yellow-700',
    };
  }
  return {
    ring: 'ring-red-400',
    text: 'text-red-600',
    bg: 'bg-red-50',
    label: 'text-red-700',
  };
}

/**
 * A labelled section that renders its content via MarkdownRenderer.
 */
function FeedbackSection({ title, icon, content, headingClassName }) {
  if (!content) return null;
  return (
    <div>
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${headingClassName}`}>
        {icon && <span aria-hidden="true" className="mr-1">{icon}</span>}
        {title}
      </h3>
      <MarkdownRenderer className="prose prose-sm max-w-none text-[var(--text)] [&_code]:bg-[var(--code-bg)] [&_pre]:bg-[var(--code-bg)]">
        {content}
      </MarkdownRenderer>
    </div>
  );
}

/**
 * EvaluationDisplay — renders the AI evaluation for a submitted answer.
 *
 * Props:
 *   evaluation  {{ score: number, strengths: string, gaps: string, modelAnswer: string }}
 *   question    {string}  – optional question text shown as context header
 *
 * Requirements: 6.5, 13.1, 13.2
 */
export default function EvaluationDisplay({ evaluation, question }) {
  if (!evaluation) return null;

  const { score, strengths, gaps, modelAnswer } = evaluation;
  const colors = scoreColorClasses(score);

  return (
    <section
      aria-label="Answer evaluation"
      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow)] p-6 text-left space-y-6"
    >
      {/* Optional question context */}
      {question && (
        <p className="text-xs text-[var(--text)] border-b border-[var(--border)] pb-3 line-clamp-2">
          <span className="font-semibold text-[var(--text-h)]">Q: </span>
          {question}
        </p>
      )}

      {/* Score display */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center w-20 h-20 rounded-full ring-4 ${colors.ring} ${colors.bg} shrink-0`}
          aria-label={`Score: ${score} out of 10`}
        >
          <span className={`text-3xl font-bold ${colors.text}`}>{score}</span>
        </div>
        <div>
          <p className={`text-lg font-semibold ${colors.text}`}>
            {score} / 10
          </p>
          <p className={`text-sm ${colors.label}`}>
            {score >= 7 ? 'Strong answer' : score >= 5 ? 'Solid baseline' : 'Needs improvement'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-[var(--border)]" />

      {/* Strengths */}
      <FeedbackSection
        title="Strengths"
        icon="✓"
        content={strengths}
        headingClassName="text-green-700"
      />

      {/* Gaps */}
      <FeedbackSection
        title="Gaps"
        icon="△"
        content={gaps}
        headingClassName="text-yellow-700"
      />

      {/* Model Answer */}
      <FeedbackSection
        title="Model Answer"
        icon="★"
        content={modelAnswer}
        headingClassName="text-[var(--accent)]"
      />
    </section>
  );
}
