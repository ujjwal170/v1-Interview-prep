/**
 * SettingsContext.jsx
 *
 * Provides application-wide settings (API key, default difficulty, mock flag)
 * to the React component tree.
 *
 * Context value shape:
 *   {
 *     apiKey:             string | null,   // loaded from IndexedDB; null until loaded or cleared
 *     setApiKey:          (key: string) => Promise<void>,
 *     clearApiKey:        () => Promise<void>,
 *     defaultDifficulty:  string,          // 'adaptive' | 'easy' | 'medium' | 'hard' | 'mixed'
 *     useMock:            boolean,         // build-time flag: VITE_USE_MOCK === 'true'
 *     loading:            boolean,         // true while initial settings are being loaded
 *   }
 *
 * Requirements: 15.1, 15.2, 15.3, 16.4
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../services/sessionService.js';

// ---------------------------------------------------------------------------
// Build-time flag — evaluated once at module load, never changes at runtime.
// ---------------------------------------------------------------------------
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** @type {React.Context<import('./SettingsContext').SettingsContextValue>} */
export const SettingsContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Wrap your application (or the relevant subtree) with this provider so that
 * any descendant can call `useSettings()` to read or update settings.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function SettingsProvider({ children }) {
  const [apiKey, setApiKeyState] = useState(null);
  const [defaultDifficulty, setDefaultDifficultyState] = useState('adaptive');
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Load settings from IndexedDB on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const [storedApiKey, storedDifficulty] = await Promise.all([
          getSetting('apiKey'),
          getSetting('defaultDifficulty'),
        ]);

        if (!cancelled) {
          // Only update state if a value was actually stored; otherwise keep
          // the sensible defaults set by useState above.
          if (storedApiKey !== undefined) {
            setApiKeyState(storedApiKey ?? null);
          }
          if (storedDifficulty !== undefined) {
            setDefaultDifficultyState(storedDifficulty);
          }
        }
      } catch (err) {
        // IndexedDB may be unavailable (handled at the App level by openDB).
        // Silently fall back to defaults so the context is still usable.
        console.error('[SettingsContext] Failed to load settings from IndexedDB:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Mutators
  // -------------------------------------------------------------------------

  /**
   * Persist a new API key and update the in-memory state.
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  async function setApiKey(key) {
    await setSetting('apiKey', key);
    setApiKeyState(key);
  }

  /**
   * Clear the stored API key (sets it to null in both IndexedDB and state).
   *
   * @returns {Promise<void>}
   */
  async function clearApiKey() {
    await setSetting('apiKey', null);
    setApiKeyState(null);
  }

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = {
    apiKey,
    setApiKey,
    clearApiKey,
    defaultDifficulty,
    useMock: USE_MOCK,
    loading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Convenience hook for consuming `SettingsContext`.
 *
 * Must be called inside a `<SettingsProvider>` subtree.
 *
 * @returns {{ apiKey: string|null, setApiKey: Function, clearApiKey: Function, defaultDifficulty: string, useMock: boolean, loading: boolean }}
 */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (ctx === null) {
    throw new Error('useSettings must be used within a <SettingsProvider>');
  }
  return ctx;
}
