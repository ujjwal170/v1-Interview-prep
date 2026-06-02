/**
 * RootLayout.jsx
 *
 * Top-level layout component rendered by the root route.
 * Composes the persistent shell (Header, DemoBanner) around the
 * route-level content (via <Outlet />) and wraps it in an ErrorBoundary
 * so render-time errors in any page are caught gracefully.
 *
 * In production mode (VITE_USE_MOCK !== 'true'), if no API key is saved,
 * the user is redirected to /settings until they add one.
 *
 * Requirements: 15.6, 15.7, 15.8, 17.2
 */

import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Header from './Header';
import DemoBanner from './DemoBanner';
import ErrorBoundary from './ErrorBoundary';
import { useSettings } from '../contexts/SettingsContext.jsx';

export default function RootLayout() {
  const { apiKey, useMock, loading: settingsLoading } = useSettings();
  const location = useLocation();

  // In production (non-mock) mode, redirect to /settings until a key is saved.
  // Don't redirect while settings are still loading to avoid a flash.
  const isProductionMode = !useMock;
  const needsKey = isProductionMode && !apiKey && !settingsLoading;
  const isOnSettings = location.pathname === '/settings';

  if (needsKey && !isOnSettings) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />
      {/* DemoBanner is dev/mock-only — hidden in production */}
      {useMock && <DemoBanner />}
      <ErrorBoundary>
        <main className="flex-1">
          <Outlet />
        </main>
      </ErrorBoundary>
    </div>
  );
}
