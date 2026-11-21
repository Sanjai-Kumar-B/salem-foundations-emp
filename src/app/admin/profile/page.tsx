'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  Calendar,
  MapPin,
  LogOut,
  CheckCircle2,
  Lock,
  Key,
  BadgeCheck,
  Server,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

export default function AdminProfilePage() {
  const router = useRouter();
  const { employee, user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out of your administrator account?')) {
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out successfully.');
      router.push('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
      toast.error('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 relative pb-28">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Profile Hero Header */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs relative overflow-hidden">
          {/* Subtle gradient backdrop element */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-100/40 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-900 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-950/20">
                  {getInitials(employee?.name)}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                  title="Account Status: Active"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {employee?.name || 'System Administrator'}
                  </h1>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs uppercase tracking-wider px-2.5 py-0.5">
                    Administrator
                  </Badge>
                </div>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Salem Foundations Institutional Administration & Admissions Management
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {employee?.email || user?.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {employee?.phone || 'Direct Line Not Set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Scope Pill */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs shrink-0 w-full md:w-auto">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Administrative Scope
              </div>
              <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-600" />
                Full System Management
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Access Level: Tier-1 Institutional Superuser
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personal & Institutional Details */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Official Staff Profile */}
            <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-6">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <User className="w-4.5 h-4.5 text-blue-600" />
                Personal & Professional Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Full Legal Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.name || 'Not Available'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Primary Email Address
                  </span>
                  <span className="font-bold text-slate-900 text-sm truncate block">
                    {employee?.email || user?.email || 'Not Available'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Contact Phone Number
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.phone || 'Not Configured'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Alternate Phone
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.alternatePhone || 'None Registered'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Department
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.department || 'Administration & Executive Office'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Designation
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.designation || 'System Administrator'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Date of Birth (DOB)
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.dob ? employee.dob : 'Not Recorded'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Date of Joining
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.joiningDate ? employee.joiningDate : 'Founding Member'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Institutional Location & Address
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee?.address ? `${employee.address}, ` : ''}
                    {employee?.city || 'Salem, Tamil Nadu'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 2: Permissions & Administrative Scope */}
            <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-6">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Shield className="w-4.5 h-4.5 text-blue-600" />
                Administrative Capabilities & Permissions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    title: 'Employee Management',
                    desc: 'Create, update, and manage admissions counsellors & calling targets.',
                  },
                  {
                    title: 'Lead Import & Deduplication',
                    desc: 'Excel/CSV bulk lead import with automated duplicate resolution.',
                  },
                  {
                    title: 'Leads Assignment & Balancing',
                    desc: 'Distribute student leads and balance workloads based on team averages.',
                  },
                  {
                    title: 'Institutional Analytics & PDF Export',
                    desc: 'Full visibility over admissions funnels, connect rates, and PDF reports.',
                  },
                  {
                    title: 'WhatsApp Message Templates',
                    desc: 'Create and sync official collateral to the telecalling workspace.',
                  },
                  {
                    title: 'Role-Based Access Control',
                    desc: 'Enforce security boundaries between Admin and Counsellor workspaces.',
                  },
                ].map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/60"
                  >
                    <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{cap.title}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Security Snapshot & Sign Out */}
          <div className="lg:col-span-4 space-y-6">
            {/* Security Snapshot Card */}
            <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Lock className="w-4 h-4 text-emerald-600" />
                Account & Security Status
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Authentication</span>
                  <span className="font-bold text-slate-800">Firebase Auth</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Security Clearance</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                    ADMIN_FULL_ACCESS
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Session Type</span>
                  <span className="font-bold text-slate-800">Secure HTTP Cookie</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Account ID</span>
                  <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[150px]">
                    {employee?.id || user?.uid}
                  </span>
                </div>
              </div>
            </Card>

            {/* Sign Out Card (Moved inside Profile as requested) */}
            <Card className="rounded-2xl border-2 border-rose-200 bg-gradient-to-b from-rose-50/40 to-white shadow-xs p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-rose-950 text-base">Sign Out of Account</h3>
                  <p className="text-xs text-rose-700/80 mt-0.5">
                    Terminate your active administrative session on this workstation.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-white/80 p-3 rounded-xl border border-rose-100">
                Signing out will clear your cached authorization tokens and redirect you to the main Salem Foundations login portal.
              </p>

              <Button
                onClick={handleSignOut}
                isLoading={signingOut}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 gap-2 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Now
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
