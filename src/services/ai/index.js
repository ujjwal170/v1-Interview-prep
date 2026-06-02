/**
 * AI Provider factory.
 *
 * Selects the appropriate AI provider based on the current settings:
 *   - Returns MockProvider when `useMock === true` or `apiKey` is empty/null
 *   - Returns GeminiProvider otherwise
 *
 * Requirements: 14.2, 14.3, 15.6, 15.8
 */

import { MockProvider, getScenario } from './MockProvider.js';
import { GeminiProvider } from './GeminiProvider.js';

/**
 * Returns an AI provider instance based on the given configuration.
 *
 * @param {{ useMock: boolean, apiKey: string|null, scenario?: string }} options
 * @returns {import('./AIProvider.js').AIProvider}
 */
export function getAIProvider({ useMock, apiKey, scenario }) {
  if (useMock || !apiKey) return new MockProvider({ scenario });
  return new GeminiProvider({ apiKey });
}
