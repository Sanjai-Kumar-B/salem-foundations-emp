'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Employee } from '@/types';

interface AuthContextType {
  user: User | null;
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

function mapDocToEmployee(id: string, raw: Record<string, unknown>): Employee {
  return {
    id,
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    phone: String(raw.phone ?? ''),
    role: (raw.role as Employee['role']) ?? 'COUNSELLOR',
    isActive: Boolean(raw.isActive ?? true),
    dailyCallTarget: Number(raw.dailyCallTarget ?? 25),
    createdAt: raw.createdAt as Employee['createdAt'],
    updatedAt: raw.updatedAt as Employee['updatedAt'],
    lastLoginAt: raw.lastLoginAt as Employee['lastLoginAt'],
    firstCallTimeToday: raw.firstCallTimeToday as Employee['firstCallTimeToday'],
  };
}

async function loadEmployeeProfile(user: User): Promise<Employee> {
  const idToken = await user.getIdToken();
  const response = await fetch(`/api/employees/${user.uid}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Failed to load employee profile (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // Keep the default message when the response body is not JSON.
    }

    throw new Error(message);
  }

  const employeeData = (await response.json()) as Record<string, unknown>;
  const mapped = mapDocToEmployee(user.uid, employeeData);

  if (!mapped.isActive) {
    throw new Error('Your account is deactivated. Please contact admin.');
  }

  return mapped;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployee = useCallback(async (user: User) => loadEmployeeProfile(user), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (!firebaseUser) {
        setUser(null);
        setEmployee(null);
        setLoading(false);
        return;
      }

      try {
        const employeeData = await loadEmployee(firebaseUser);
        setUser(firebaseUser);
        setEmployee(employeeData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load profile';
        setError(message);
        await firebaseSignOut(auth);
        setUser(null);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadEmployee]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const employeeData = await loadEmployee(credential.user);
      setUser(credential.user);
      setEmployee(employeeData);

      if (employeeData.role === 'ADMIN') {
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
    setError(null);
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, {
        displayName: email.split('@')[0],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setEmployee(null);
    router.push('/login');
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      employee,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      isAdmin: employee?.role === 'ADMIN',
      isCounsellor: employee?.role === 'COUNSELLOR',
    }),
    [user, employee, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
