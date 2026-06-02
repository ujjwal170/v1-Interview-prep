import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

/**
 * Allowed HTML elements — a safe subset that covers typical Markdown output.
 * Raw HTML tags not in this list are stripped before rendering, preventing XSS
 * from AI-generated content (Requirement 13.3).
 */
const ALLOWED_ELEMENTS = [
  // Block
  'p', 'blockquote', 'pre', 'hr', 'br',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Lists
  'ul', 'ol', 'li',
  // Table
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  // Inline
  'a', 'em', 'strong', 'del', 's', 'code', 'span',
  // Code block (rehype-highlight wraps in these)
  'div',
];

/**
 * MarkdownRenderer renders AI-produced Markdown text with:
 *  - Syntax-highlighted fenced code blocks via rehype-highlight (Req 13.2)
 *  - HTML sanitization via allowedElements to prevent XSS (Req 13.3)
 *
 * @param {{ children: string, className?: string }} props
 */
export default function MarkdownRenderer({ children, className }) {
  return (
    <div className={className}>
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        rehypePlugins={[rehypeHighlight]}
      >
        {children ?? ''}
      </ReactMarkdown>
    </div>
  );
}
