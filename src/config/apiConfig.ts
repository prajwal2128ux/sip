/**
 * PlagiCheck - AI Detector & External API Configuration
 *
 * Configured with user's Winston AI API Key
 */

export interface ApiSettings {
  provider: 'winston' | 'sapling' | 'gemini' | 'openai' | 'custom_ai_detector' | 'auto';
  apiKey: string;
  apiEndpoint?: string;
  modelName?: string;
}

export const API_CONFIG: ApiSettings = {
  // 1. Provider
  provider: 'winston',

  // 2. User's Winston AI API Key
  apiKey: 'wltr_L1gIJqKpLAwQI4KqTMikg3uCGaTidGSFdpTAdk6D1rU',

  // 3. Endpoint for Winston AI Content Detection
  apiEndpoint: 'https://api.gowinston.ai/v2/ai-content-detection',

  modelName: 'gemini-2.5-flash'
};

/**
 * Helper to check if a valid custom external API is active
 */
export function isCustomApiConfigured(): boolean {
  return Boolean(
    API_CONFIG.apiKey &&
    API_CONFIG.apiKey.trim().length > 5 &&
    !API_CONFIG.apiKey.includes('YOUR_API_KEY')
  );
}

/**
 * Returns formatted details about the current API connection
 */
export function getApiStatus(): {
  isConnected: boolean;
  provider: string;
  maskedKey: string;
} {
  const isConnected = isCustomApiConfigured();
  const rawKey = API_CONFIG.apiKey.trim();
  const maskedKey = isConnected
    ? `${rawKey.slice(0, 7)}...${rawKey.slice(-4)}`
    : 'Not configured (using Built-in Engine)';

  let provider = 'Built-in Universal NLP Engine';
  if (isConnected) {
    if (rawKey.startsWith('wltr_') || API_CONFIG.provider === 'winston') {
      provider = 'Winston AI Detector (Live API)';
    } else if (API_CONFIG.provider === 'sapling' || rawKey.length === 32 || API_CONFIG.apiEndpoint?.includes('sapling')) {
      provider = 'Sapling AI Detector (Live)';
    } else if (rawKey.startsWith('AIzaSy') || API_CONFIG.provider === 'gemini') {
      provider = 'Google Gemini AI (Live)';
    } else if (rawKey.startsWith('sk-') || API_CONFIG.provider === 'openai') {
      provider = 'OpenAI API (Live)';
    } else if (API_CONFIG.apiEndpoint) {
      provider = 'Custom AI Detector API';
    } else {
      provider = 'External AI Detector API';
    }
  }

  return {
    isConnected,
    provider,
    maskedKey
  };
}
