/**
 * App.jsx
 *
 * Root component. Responsibilities:
 *  1. Gate on IndexedDB availability (Requirement 16.3): call openDB() on
 *     mount; if it fails with { type: 'IndexedDBUnavailable' }, render
 *     IndexedDBUnavailablePage instead of the router.
 *  2. Wrap the entire app in the three cross-cutting context providers
 *     (Settings, SkillProfile, Toast) in the order specified by the design.
 *  3. Mount the data router (createBrowserRouter + RouterProvider) with all
 *     eight routes nested under RootLayout (Requirement 16.4).
 *
 * The data router API is required so SessionRunPage can use the useBlocker
 * hook for its "Leave session?" navigation guard.
 *
 * Provider wrapping order (outermost → innermost):
 *   SettingsProvider → SkillProfileProvider → ToastProvider → RouterProvider
 *
 * Requirements: 16.3, 16.4
 */

import { useState, useEffect, useMemo, lazy, Suspense } from 'react' // useMemo restored — router must be stable across re-renders
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { SettingsProvider } from './contexts/SettingsContext.jsx'
import { SkillProfileProvider } from './contexts/SkillProfileContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'

import { openDB } from './services/db.js'

import RootLayout from './components/RootLayout.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
// IndexedDBUnavailablePage stays eager — it's the fallback before routing
import IndexedDBUnavailablePage from './pages/IndexedDBUnavailablePage.jsx'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const SessionConfigPage = lazy(() => import('./pages/SessionConfigPage.jsx'))
const SessionRunPage = lazy(() => import('./pages/SessionRunPage.jsx'))
const SessionSummaryPage = lazy(() => import('./pages/SessionSummaryPage.jsx'))
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'))
const HistoryDetailPage = lazy(() => import('./pages/HistoryDetailPage.jsx'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))

// Centered spinner shown while a lazy route chunk is loading
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" label="Loading…" />
    </div>
  )
}

// Wrap each lazy page in Suspense so chunk loads show the fallback
function lazyRoute(Element) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Element />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// DB init states
// ---------------------------------------------------------------------------

/** @typedef {'loading' | 'ready' | 'unavailable'} DBStatus */

export default function App() {
  /** @type {[DBStatus, React.Dispatch<React.SetStateAction<DBStatus>>]} */
  const [dbStatus, setDbStatus] = useState(/** @type {DBStatus} */ ('loading'))

  // -------------------------------------------------------------------------
  // IndexedDB gate (task 19.2 / Requirement 16.3)
  // -------------------------------------------------------------------------

  async function initDB() {
    setDbStatus('loading')
    try {
      await openDB()
      setDbStatus('ready')
    } catch (err) {
      if (err && err.type === 'IndexedDBUnavailable') {
        setDbStatus('unavailable')
      } else {
        console.error('[App] Unexpected error opening IndexedDB:', err)
        setDbStatus('unavailable')
      }
    }
  }

  useEffect(() => {
    initDB()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Build the router once the DB is ready. Memoized so the router instance
  // is stable across re-renders (re-creating it would lose navigation state).
  // -------------------------------------------------------------------------

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const router = useMemo(() => createBrowserRouter([
    {
      element: <RootLayout />,
      children: [
        { index: true, element: lazyRoute(HomePage) },
        { path: 'session/new', element: lazyRoute(SessionConfigPage) },
        { path: 'session/:id', element: lazyRoute(SessionRunPage) },
        { path: 'session/:id/summary', element: lazyRoute(SessionSummaryPage) },
        { path: 'history', element: lazyRoute(HistoryPage) },
        { path: 'history/:id', element: lazyRoute(HistoryDetailPage) },
        { path: 'analytics', element: lazyRoute(AnalyticsPage) },
        { path: 'settings', element: lazyRoute(SettingsPage) },
      ],
    },
  ]), [])

  // -------------------------------------------------------------------------
  // Loading state — shown while openDB() is in flight
  // -------------------------------------------------------------------------

  if (dbStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <span className="text-[var(--text)] opacity-60 text-sm">Loading…</span>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // IndexedDB unavailable — show error page (no router, no providers needed)
  // -------------------------------------------------------------------------

  if (dbStatus === 'unavailable') {
    return <IndexedDBUnavailablePage onRetry={initDB} />
  }

  // -------------------------------------------------------------------------
  // Happy path — full app with providers + data router
  // -------------------------------------------------------------------------

  return (
    <SettingsProvider>
      <SkillProfileProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </SkillProfileProvider>
    </SettingsProvider>
  )
}
