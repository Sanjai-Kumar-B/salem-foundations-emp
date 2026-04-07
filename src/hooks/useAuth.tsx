'use client';

/**
 * Unified Auth Hook
 * 
 * Automatically switches between mock and real Firebase auth
 * based on the USE_MOCK_DATA config flag
 */

import { USE_MOCK_DATA } from '@/lib/config';

// Re-export the appropriate auth provider based on config
export { AuthProvider, useAuth } from './useMockAuth';

// When switching to real Firebase, change the import above to:
// export { AuthProvider, useAuth } from './useRealAuth';
