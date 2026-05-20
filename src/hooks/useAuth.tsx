'use client';

/**
 * Unified Auth Hook
 * 
 * Automatically switches between mock and real Firebase auth
 * based on the USE_MOCK_DATA config flag
 */

// Re-export the appropriate auth provider based on config
export { AuthProvider, useAuth } from './useRealAuth';

// To return to demo mode:
// if (USE_MOCK_DATA) export from './useMockAuth'
