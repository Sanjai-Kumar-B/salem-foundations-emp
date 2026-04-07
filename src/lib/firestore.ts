/**
 * Unified Firestore Service
 * 
 * Automatically switches between mock and real Firestore
 * based on the USE_MOCK_DATA config flag
 */

// Currently using mock data - switch to real Firestore when ready
export {
    // Employees
    getEmployee,
    getEmployeeByEmail,
    getAllEmployees,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    logEmployeeActivity,
    // Leads
    getLead,
    getLeadsByEmployee,
    getUnassignedLeads,
    getAllLeads,
    checkDuplicateLead,
    importLeads,
    assignLeadsToEmployee,
    updateLeadStage,
    // Tasks
    getTask,
    getTasksByEmployee,
    getTodaysTasks,
    getOverdueTasks,
    createTask,
    completeTask,
    // Call Outcomes
    recordCallOutcome,
    getCallOutcomesByLead,
    getCallOutcomesByEmployee,
    getTodaysCallCount,
    // Reporting
    getEmployeeStats,
    // Constants
    COLLECTIONS,
} from './mockFirestore';

// When switching to real Firebase, change the import above to:
// } from './realFirestore';
