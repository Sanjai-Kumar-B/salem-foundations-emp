/**
 * Firestore Service Layer
 * Connects directly to Cloud Firestore
 */

export {
    getAllEmployees,
    createEmployee,
    updateEmployee,
    activateEmployee,
    deactivateEmployee,
    deleteEmployee,
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
    createWhatsAppTemplate,
    updateWhatsAppTemplate,
    deleteWhatsAppTemplate,
    COLLECTIONS,
} from './realFirestore';
