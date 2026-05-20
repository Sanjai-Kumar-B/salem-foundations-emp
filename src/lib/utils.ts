import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Convert Firestore Timestamp to Date
 */
export function timestampToDate(timestamp: Timestamp | undefined): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate();
}

/**
 * Format date for display
 */
export function formatDate(date: Date | Timestamp | null | undefined, formatStr: string = 'PPP'): string {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return format(d, formatStr);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | Timestamp | null | undefined): string {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Get friendly due date label
 */
export function getDueDateLabel(date: Date | Timestamp | null | undefined): string {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : date;

    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isPast(d)) return `Overdue (${format(d, 'MMM d')})`;
    return format(d, 'MMM d, yyyy');
}

/**
 * Check if date is overdue
 */
export function isOverdue(date: Date | Timestamp | null | undefined): boolean {
    if (!date) return false;
    const d = date instanceof Timestamp ? date.toDate() : date;
    return isPast(d) && !isToday(d);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
    if (!phone) return '-';
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    // Format as Indian phone number
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
}

/**
 * Generate Calley dial link
 */
export function getCallLink(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    // Calley uses tel: protocol
    return `tel:${cleaned}`;
}

/**
 * Get priority color classes
 */
export function getPriorityColor(priority: 'HIGH' | 'MEDIUM' | 'LOW'): string {
    switch (priority) {
        case 'HIGH':
            return 'text-red-600 bg-red-50 border-red-200';
        case 'MEDIUM':
            return 'text-amber-600 bg-amber-50 border-amber-200';
        case 'LOW':
            return 'text-green-600 bg-green-50 border-green-200';
        default:
            return 'text-gray-600 bg-gray-50 border-gray-200';
    }
}

/**
 * Get stage color classes
 */
export function getStageColor(stage: string): string {
    switch (stage) {
        case 'NEW':
            return 'text-blue-600 bg-blue-50';
        case 'CONTACTED':
            return 'text-purple-600 bg-purple-50';
        case 'QUALIFIED':
            return 'text-green-600 bg-green-50';
        case 'UNQUALIFIED':
            return 'text-red-600 bg-red-50';
        case 'CONVERTED':
            return 'text-emerald-600 bg-emerald-50';
        case 'CLOSED':
            return 'text-gray-600 bg-gray-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}

export function getLeadStatusColor(status: string): string {
    switch (status) {
        case 'NEW':
            return 'text-blue-700 bg-blue-50';
        case 'CONTACTED':
            return 'text-amber-700 bg-amber-50';
        case 'INTERESTED':
            return 'text-green-700 bg-green-50';
        case 'NOT_INTERESTED':
            return 'text-red-700 bg-red-50';
        case 'CONVERTED':
            return 'text-emerald-700 bg-emerald-50';
        default:
            return 'text-gray-700 bg-gray-50';
    }
}

export function formatActivityType(type: 'call' | 'note' | 'followup' | 'status_change'): string {
    switch (type) {
        case 'call':
            return 'Call';
        case 'note':
            return 'Note';
        case 'followup':
            return 'Follow-up';
        case 'status_change':
            return 'Status Update';
        default:
            return 'Activity';
    }
}

/**
 * Get task status color
 */
export function getTaskStatusColor(status: 'PENDING' | 'COMPLETED' | 'OVERDUE'): string {
    switch (status) {
        case 'PENDING':
            return 'text-amber-600 bg-amber-50';
        case 'COMPLETED':
            return 'text-green-600 bg-green-50';
        case 'OVERDUE':
            return 'text-red-600 bg-red-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}

/**
 * Validate Indian mobile number
 */
export function isValidMobile(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    // Indian mobile: 10 digits starting with 6-9
    if (cleaned.length === 10) {
        return /^[6-9]\d{9}$/.test(cleaned);
    }
    // With country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return /^91[6-9]\d{9}$/.test(cleaned);
    }
    return false;
}

/**
 * Normalize mobile number to 10-digit format
 */
export function normalizeMobile(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return cleaned.slice(2);
    }
    return cleaned;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
