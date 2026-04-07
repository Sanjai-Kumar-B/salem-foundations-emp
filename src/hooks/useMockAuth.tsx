'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { mockEmployees, DEMO_USERS } from '@/lib/mockData';
import { Employee } from '@/types';

interface MockUser {
    email: string;
    uid: string;
}

interface AuthContextType {
    user: MockUser | null;
    employee: Employee | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    isCounsellor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<MockUser | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signIn = async (email: string, password: string) => {
        setError(null);
        setLoading(true);

        try {
            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Check demo credentials
            const validUser = Object.values(DEMO_USERS).find(
                (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );

            if (!validUser) {
                throw new Error('Invalid email or password. Try admin@demo.com / demo123');
            }

            // Find employee record
            const emp = mockEmployees.find(
                (e) => e.email.toLowerCase() === email.toLowerCase()
            );

            if (!emp) {
                throw new Error('Employee record not found');
            }

            if (!emp.isActive) {
                throw new Error('Account is deactivated');
            }

            // Set user and employee
            setUser({ email: emp.email, uid: emp.id });
            setEmployee(emp);

            // Redirect based on role
            if (emp.role === 'ADMIN') {
                router.push('/admin/dashboard');
            } else {
                router.push('/counsellor/dashboard');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign in failed';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string) => {
        setError('Sign up is disabled in demo mode');
        throw new Error('Sign up is disabled in demo mode');
    };

    const signOut = async () => {
        setUser(null);
        setEmployee(null);
        router.push('/login');
    };

    const value: AuthContextType = {
        user,
        employee,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        isAdmin: employee?.role === 'ADMIN',
        isCounsellor: employee?.role === 'COUNSELLOR',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
