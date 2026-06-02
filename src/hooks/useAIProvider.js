/**
 * useAIProvider hook
 *
 * Subscribes to SettingsContext and returns a memoized AI provider instance.
 * The provider is re-created only when `useMock`, `apiKey`, or `scenario` change,
 * so callers pick up provider swaps (e.g. user adds an API key) without a reload.
 *
 * Requirements: 14.2, 14.3, 15.6, 15.8
 */

import { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext.jsx';
import { getAIProvider } from '../services/ai/index.js';
import { getScenario } from '../services/ai/MockProvider.js';

/**
 * Returns a memoized AI provider instance keyed on (useMock, apiKey, scenario).
 *
 * @returns {import('../services/ai/AIProvider.js').AIProvider}
 */
export function useAIProvider() {
  const { useMock, apiKey } = useSettings();

  // Resolve the scenario once outside the memo — getScenario() reads from the
  // URL or env at call time, which is stable within a render cycle.
  const scenario = getScenario();

  return useMemo(
    () => getAIProvider({ useMock, apiKey, scenario }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useMock, apiKey, scenario],
  );
}
