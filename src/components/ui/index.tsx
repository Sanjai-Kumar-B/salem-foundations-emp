import React from 'react';
import { cn } from '@/lib/utils';

// ============ BUTTON ============

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    disabled,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
        ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
}

// ============ INPUT ============

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    'w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                    error ? 'border-red-500' : 'border-gray-300',
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}

// ============ SELECT ============

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <select
                className={cn(
                    'w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white',
                    error ? 'border-red-500' : 'border-gray-300',
                    className
                )}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}

// ============ TEXTAREA ============

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <textarea
                className={cn(
                    'w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none',
                    error ? 'border-red-500' : 'border-gray-300',
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}

// ============ CARD ============

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', paddings[padding], className)}>
            {children}
        </div>
    );
}

// ============ BADGE ============

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    };

    return (
        <span className={cn('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}>
            {children}
        </span>
    );
}

// ============ LOADING SPINNER ============

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={cn(
                    'animate-spin rounded-full border-2 border-gray-200 border-t-blue-600',
                    sizes[size]
                )}
            />
        </div>
    );
}

// ============ EMPTY STATE ============

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {icon && <div className="text-gray-400 mb-4">{icon}</div>}
            <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
            {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
            {action}
        </div>
    );
}

// ============ STAT CARD ============

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
    return (
        <Card className={cn('flex items-center gap-4', className)}>
            {icon && (
                <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg text-blue-600">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {trend && (
                    <p className={cn('text-sm font-medium', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </p>
                )}
            </div>
        </Card>
    );
}

// ============ MODAL ============

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
                <div className={cn('relative bg-white rounded-xl shadow-xl w-full', sizes[size])}>
                    <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

// ============ TABLE ============

interface Column<T> {
    key: keyof T | string;
    header: React.ReactNode;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField: keyof T;
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
}

export function Table<T>({ columns, data, keyField, onRowClick, isLoading, emptyMessage = 'No data available' }: TableProps<T>) {
    if (isLoading) {
        return (
            <div className="py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <EmptyState title={emptyMessage} />
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200">
                        {columns.map((col) => (
                            <th
                                key={String(col.key)}
                                className={cn('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', col.className)}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((item) => (
                        <tr
                            key={String(item[keyField])}
                            onClick={() => onRowClick?.(item)}
                            className={cn('hover:bg-gray-50 transition-colors', onRowClick && 'cursor-pointer')}
                        >
                            {columns.map((col) => (
                                <td key={String(col.key)} className={cn('px-4 py-3 text-sm text-gray-900', col.className)}>
                                    {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
