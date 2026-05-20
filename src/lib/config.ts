/**
 * App Configuration
 * 
 * Set USE_MOCK_DATA to true for demo mode (uses local mock data)
 * Set to false when ready to connect to real Firebase
 */

export const USE_MOCK_DATA = false;

export const APP_CONFIG = {
    name: 'Employee Management System',
    version: '1.0.0',
    environment: USE_MOCK_DATA ? 'demo' : 'production',
};
