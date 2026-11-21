'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, ExternalLink, Headphones, ArrowRight } from 'lucide-react';

export default function EmployeeLoginPage() {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // 2-second intro splash screen state
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFade(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please enter both your email and password');
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      console.error('Employee login error:', err);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        setFormError('Invalid employee credentials. Please check your email and password.');
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* 2-Second Intro Splash Screen */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 transition-all duration-700 ease-in-out ${
            splashFade ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          <div className="absolute w-72 h-72 bg-blue-600/20 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse" />

          {/* Intro Oddmachine Logo (Circle Shape) */}
          <div className="flex flex-col items-center space-y-5 animate-in fade-in zoom-in duration-500">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-slate-700/80 shadow-[0_0_35px_rgba(59,130,246,0.35)] bg-slate-900 flex items-center justify-center p-1.5 transition-transform">
              <img
                src="/Oddmachine.png"
                alt="Oddmachine"
                className="w-full h-full object-cover rounded-full filter drop-shadow-md"
              />
            </div>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-400/10 via-indigo-300/5 to-transparent pointer-events-none -z-10" />

      {/* Top Bar Switch Link */}
      <div className="w-full max-w-md mx-auto flex justify-end pt-2">
        <Link
          href="/admin/login"
          className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/90 hover:border-blue-300 transition-all shadow-2xs"
        >
          <span>Admin Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Center Container */}
      <div className="w-full max-w-md mx-auto my-auto py-4 sm:py-0">
        {/* Main Logo & Institution Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block p-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-3 hover:shadow-md transition-shadow">
            <img
              src="/logo_eng.jpg"
              alt="Salem Foundations"
              className="h-16 sm:h-20 w-auto object-contain rounded-xl"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Headphones className="w-3 h-3 text-blue-600" />
              Employee Portal
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
            Salem Foundations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Staff &amp; Counsellor Telecalling Workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90 transition-all">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Employee Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to access your calling queue &amp; leads</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {(formError || error) && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200/90 rounded-2xl text-rose-800 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <p className="leading-relaxed font-medium">{formError || error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Staff Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="counsellor@test.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter employee password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50/60 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                size="lg"
                isLoading={loading}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Counsellor Workspace</span>
              </Button>
            </div>
          </form>

          {/* Switch link */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need administrator access?{' '}
              <Link href="/admin/login" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2">
                Switch to Admin Portal
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Developer Attribution */}
      <footer className="w-full max-w-md mx-auto pt-6 pb-2 text-center text-xs text-slate-500">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Developed by</span>
            <a
              href="https://www.sanjaikumar.tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-800 hover:text-blue-600 transition-colors inline-flex items-center gap-1 group underline-offset-2 hover:underline"
            >
              <span>Sanjai Kumar</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </a>
          </div>

          <a
            href="https://www.sanjaikumar.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center group mt-1"
            title="Visit Sanjai Kumar's Portfolio"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-300/80 shadow-2xs p-0.5 bg-white group-hover:scale-110 group-hover:border-blue-500 group-hover:shadow-md transition-all duration-200">
              <img
                src="/Oddmachine.png"
                alt="Oddmachine"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </a>
        </div>
      </footer>
    </div>
  );
}
