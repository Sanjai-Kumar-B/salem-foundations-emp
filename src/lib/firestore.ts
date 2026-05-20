/**
 * Unified Firestore Service
 * 
 * Automatically switches between mock and real Firestore
 * based on the USE_MOCK_DATA config flag
 */

export {
    getAllEmployees,
    createEmployee,
    deactivateEmployee,
    getLeadsByEmployee,
    getAllLeads,
    createLead,
    deleteLead,
    importLeads,
    assignLeadsToEmployee,
    getTodaysTasks,
    getOverdueTasks,
    recordCallOutcome,
    getCallOutcomesByEmployee,
    getTodaysCallCount,
    getLeadActivities,
    getEmployeeStats,
    getEmployeePerformanceMetrics,
    getAllWhatsAppTemplates,
    COLLECTIONS,
} from './realFirestore';
