/**
 * Header.jsx
 *
 * Application-wide top navigation bar.
 *
 * - App name "I-Prep" links to "/"
 * - Nav links: Home, History, Analytics, Settings
 * - Uses NavLink for active-state styling
 * - Styled with Tailwind + CSS vars
 */

import { Link, NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]">
      {/* On very small screens (< 640px) allow the header to grow taller so
          the brand + nav can wrap onto two lines without overflowing (Req 18.1, 18.2) */}
      <div className="mx-auto flex min-h-14 max-w-screen-xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 sm:flex-nowrap sm:px-6">
        {/* Brand */}
        <Link
          to="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-[var(--text-h)] hover:text-[var(--accent)] transition-colors"
        >
          I-Prep
        </Link>

        {/* Nav — scrollable on very narrow viewports as a last resort */}
        <nav aria-label="Main navigation" className="min-w-0 overflow-x-auto">
          <ul className="flex items-center gap-0.5 sm:gap-2">
            {NAV_LINKS.map(({ to, label, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    [
                      'rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                      isActive
                        ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'text-[var(--text)] hover:bg-[var(--accent-bg)] hover:text-[var(--text-h)]',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
