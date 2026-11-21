'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getLeadActivities,
  getLeadsByEmployee,
  recordCallOutcome,
  getAllWhatsAppTemplates,
} from '@/lib/firestore';
import { getNextLead } from '@/lib/nextBestAction';
import { getWhatsAppLink, generateWhatsAppMessage } from '@/lib/whatsapp';
import { formatDate, formatPhone } from '@/lib/utils';
import { Lead, LeadActivity, WhatsAppTemplate, StrictCallOutcome } from '@/types';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Clock,
  Calendar,
  MapPin,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  History,
  Send,
  Flame,
  Check,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type CallState = 'READY' | 'CALLING' | 'IN_CALL' | 'OUTCOME' | 'SCHEDULING';

const OUTCOME_OPTIONS: {
  id: StrictCallOutcome;
  label: string;
  description: string;
  color: string;
  needsFollowUp: boolean;
}[] = [
  {
    id: 'INTERESTED',
    label: 'Interested',
    description: 'Lead shows strong interest in admission',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    needsFollowUp: true,
  },
  {
    id: 'CALL_LATER',
    label: 'Call Later',
    description: 'Requested callback at specific time',
    color: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    needsFollowUp: true,
  },
  {
    id: 'NO_RESPONSE',
    label: 'No Response',
    description: 'Rang but not answered / Busy',
    color: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    needsFollowUp: false,
  },
  {
    id: 'NOT_INTERESTED',
    label: 'Not Interested',
    description: 'Declined or joined another college',
    color: 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
    needsFollowUp: false,
  },
  {
    id: 'WRONG_NUMBER',
    label: 'Wrong Number',
    description: 'Invalid / wrong contact person',
    color: 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
    needsFollowUp: false,
  },
  {
    id: 'CONVERTED',
    label: 'Converted',
    description: 'Completed registration / admission',
    color: 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100',
    needsFollowUp: false,
  },
];

const FOLLOWUP_PRESETS = [
  { label: 'Later Today (3h)', getHours: () => 3 },
  { label: 'Tomorrow Morning (10 AM)', getDays: () => 1, setHour: 10 },
  { label: 'In 2 Days', getDays: () => 2, setHour: 10 },
  { label: 'Next Week', getDays: () => 7, setHour: 10 },
];

export function CounsellorWorkspaceContent() {
  const { employee } = useAuth();
  const searchParams = useSearchParams();
  const paramLeadId = searchParams?.get('leadId');

  const [loading, setLoading] = useState(true);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [actionReason, setActionReason] = useState<string | null>(null);

  // Calling state machine
  const [callState, setCallState] = useState<CallState>('READY');
  const [callDuration, setCallDuration] = useState(0);

  // Outcome submission state
  const [selectedOutcome, setSelectedOutcome] = useState<StrictCallOutcome | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [customDateTime, setCustomDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-call optional WhatsApp collateral
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState<WhatsAppTemplate | null>(null);
  const [hasSentWhatsApp, setHasSentWhatsApp] = useState(false);

  // Modals & Panels
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  // Live call timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === 'IN_CALL') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Load leads and templates
  const loadData = async (silent = false) => {
    if (!employee) return;
    if (!silent) setLoading(true);

    try {
      const [leads, tpls] = await Promise.all([
        getLeadsByEmployee(employee.id),
        getAllWhatsAppTemplates(true),
      ]);

      setAssignedLeads(leads);
      setTemplates(tpls.filter((t) => t.isActive !== false));

      let targetLead: Lead | null = null;
      let reason: string | null = null;

      if (paramLeadId) {
        targetLead = leads.find((l) => l.id === paramLeadId) || null;
        if (targetLead) {
          reason = 'Directly selected lead';
        }
      }

      if (!targetLead) {
        const recommendation = getNextLead(leads);
        targetLead = recommendation.lead as Lead | null;
        reason = recommendation.reason;
      }

      setCurrentLead(targetLead);
      setActionReason(reason);

      // Reset state machine
      setCallState('READY');
      setCallDuration(0);
      setSelectedOutcome(null);
      setOutcomeNotes('');
      setFollowUpDate('');
      setSelectedWhatsAppTemplate(null);
      setHasSentWhatsApp(false);
    } catch (error) {
      console.error('Failed to load calling workspace', error);
      toast.error('Failed to load workspace leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employee, paramLeadId]);

  // Load activities when current lead changes
  useEffect(() => {
    if (!currentLead) return;
    const loadTimeline = async () => {
      try {
        const timeline = await getLeadActivities(currentLead.id);
        setActivities(timeline);
      } catch (err) {
        console.error('Failed to load lead timeline', err);
      }
    };
    loadTimeline();
  }, [currentLead]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // State machine triggers
  const handleStartCall = () => {
    if (!currentLead) return;
    setCallState('CALLING');
    setCallDuration(0);

    // Open dialer automatically
    window.open(`tel:${currentLead.mobile.replace(/\D/g, '')}`, '_self');

    // Simulate connection after brief delay
    setTimeout(() => {
      setCallState('IN_CALL');
    }, 1200);
  };

  const handleEndCall = () => {
    setCallState('OUTCOME');
  };

  const handleSelectOutcome = (outcome: StrictCallOutcome) => {
    setSelectedOutcome(outcome);
    const config = OUTCOME_OPTIONS.find((o) => o.id === outcome);

    if (config?.needsFollowUp) {
      // Set default tomorrow follow-up preset
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      setFollowUpDate(d.toISOString());
      setCallState('SCHEDULING');
    }
  };

  const applyPresetFollowup = (preset: (typeof FOLLOWUP_PRESETS)[0]) => {
    const now = new Date();
    if (preset.getHours) {
      now.setHours(now.getHours() + preset.getHours());
    } else if (preset.getDays) {
      now.setDate(now.getDate() + preset.getDays());
      if (preset.setHour) now.setHours(preset.setHour, 0, 0, 0);
    }
    setFollowUpDate(now.toISOString());
    setCustomDateTime('');
  };

  const handleSaveOutcome = async () => {
    if (!employee || !currentLead || !selectedOutcome) {
      toast.error('Please select an outcome');
      return;
    }

    if (!outcomeNotes.trim()) {
      toast.error('Call notes are mandatory. Record what was discussed.');
      return;
    }

    const needsDate = ['INTERESTED', 'CALL_LATER'].includes(selectedOutcome);
    let finalFollowUp: Date | undefined;

    if (needsDate) {
      if (customDateTime) {
        finalFollowUp = new Date(customDateTime);
      } else if (followUpDate) {
        finalFollowUp = new Date(followUpDate);
      } else {
        toast.error('Please select a follow-up callback time.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const isConnected = !['NO_RESPONSE', 'WRONG_NUMBER'].includes(selectedOutcome);

      // If counsellor selected an optional WhatsApp template and hasn't manually opened it yet, trigger it
      if (selectedWhatsAppTemplate && !hasSentWhatsApp) {
        const waLink = getWhatsAppLink(
          currentLead,
          selectedWhatsAppTemplate,
          employee ? { name: employee.name, phone: employee.phone } : undefined
        );
        window.open(waLink, '_blank');
      }

      await recordCallOutcome(
        currentLead.id,
        employee.id,
        currentLead.source === 'APPLICATION' ? 'FOLLOW_UP' : 'BULK',
        {
          connected: isConnected,
          duration: callDuration,
          outcome: selectedOutcome,
          notes: outcomeNotes.trim(),
          followUpDate: finalFollowUp,
        }
      );

      toast.success('Outcome saved! Loading next lead...');

      // Load next lead
      await loadData(true);
    } catch (err) {
      console.error('Failed to save outcome', err);
      toast.error('Failed to save call outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipLead = () => {
    if (!assignedLeads || assignedLeads.length <= 1) {
      toast('No other leads in queue.', { icon: 'ℹ️' });
      return;
    }
    // Move current lead to end of local list and pick next
    const rest = assignedLeads.filter((l) => l.id !== currentLead?.id);
    if (currentLead) rest.push(currentLead);
    setAssignedLeads(rest);
    const recommendation = getNextLead(rest);
    setCurrentLead(recommendation.lead as Lead | null);
    setActionReason(recommendation.reason);
    setCallState('READY');
    setSelectedWhatsAppTemplate(null);
    setHasSentWhatsApp(false);
    toast('Skipped to next lead', { icon: '⏭️' });
  };

  const handleSendWhatsApp = (template: WhatsAppTemplate) => {
    if (!currentLead) return;
    const link = getWhatsAppLink(
      currentLead,
      template,
      employee ? { name: employee.name, phone: employee.phone } : undefined
    );
    window.open(link, '_blank');
    setShowWhatsAppModal(false);
    toast.success('Opened WhatsApp with template');
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-blue-600/20 border-t-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Preparing telecalling workspace...</p>
      </div>
    );
  }

  // Empty state when no leads
  if (!currentLead) {
    return (
      <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">All Caught Up!</h2>
        <p className="text-sm text-slate-500">
          You have zero pending callbacks or overdue tasks. Check the New Leads pool or refresh your queue.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => loadData()}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <RefreshCw size={16} /> Refresh Leads
          </button>
          <Link
            href="/counsellor/new-leads"
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 active:scale-95 transition-all"
          >
            <Sparkles size={16} /> Browse New Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* ========================================================= */}
      {/* 1. TOP PIPELINE SWITCHER & QUEUE INDICATOR               */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Lead
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
              actionReason === 'OVERDUE'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : actionReason === 'FOLLOW_UP_TODAY'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {actionReason === 'OVERDUE'
              ? 'Overdue Follow-up'
              : actionReason === 'FOLLOW_UP_TODAY'
              ? 'Due Today'
              : 'New Lead'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            {assignedLeads.length} leads in queue
          </span>
          <button
            onClick={handleSkipLead}
            title="Skip to next lead"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. CALLING STATE MACHINE VIEWS                           */}
      {/* ========================================================= */}

      {/* STATE A: CALLING (CONNECTING) */}
      {callState === 'CALLING' && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto animate-pulse">
            <PhoneCall size={32} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Initiating Call...
            </p>
            <h2 className="text-2xl font-black mt-1">{currentLead.name}</h2>
            <p className="text-sm font-medium text-blue-100">{formatPhone(currentLead.mobile)}</p>
          </div>
          <p className="text-xs text-blue-200">Device dialer opening... Connecting to candidate.</p>
          <button
            onClick={() => setCallState('IN_CALL')}
            className="px-6 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs uppercase tracking-wider hover:bg-blue-50 active:scale-95 shadow-sm"
          >
            Candidate Answered → Start Timer
          </button>
        </div>
      )}

      {/* STATE B: IN_CALL (ACTIVE CALL) */}
      {callState === 'IN_CALL' && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                CALL IN PROGRESS
              </span>
              <h2 className="text-2xl font-black mt-1">{currentLead.name}</h2>
              <p className="text-xs text-slate-300">{formatPhone(currentLead.mobile)}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-emerald-400 tabular-nums">
                {formatTimer(callDuration)}
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Duration</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Target Course</span>
              <span className="font-semibold text-slate-200 truncate block">
                {currentLead.course || 'Admissions'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">District</span>
              <span className="font-semibold text-slate-200 truncate block">
                {currentLead.location || currentLead.district || 'Salem'}
              </span>
            </div>
          </div>

          <button
            onClick={handleEndCall}
            className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-[0.98] transition-all min-h-[52px]"
          >
            <PhoneOff size={20} />
            <span>End Call & Record Outcome</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STUDENT LEAD INFORMATION CARD                         */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
        {/* Header row: Name, mobile, priority badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {currentLead.name}
            </h1>
            <a
              href={`tel:${currentLead.mobile.replace(/\D/g, '')}`}
              className="text-base font-bold text-blue-600 hover:underline flex items-center gap-1.5 mt-1"
            >
              <Phone size={15} />
              <span>{formatPhone(currentLead.mobile)}</span>
            </a>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                currentLead.priority === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : currentLead.priority === 'LOW'
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {currentLead.priority || 'MEDIUM'} Priority
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {currentLead.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Lead Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <div className="flex items-start gap-2">
            <GraduationCap size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Course</span>
              <p className="font-semibold text-slate-800 truncate">
                {currentLead.course || 'Admissions Enquiry'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Location</span>
              <p className="font-semibold text-slate-800 truncate">
                {currentLead.location || currentLead.district || 'Salem Region'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Lead Source</span>
              <p className="font-semibold text-slate-800 truncate">{currentLead.source || 'BULK'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 text-[10px] font-bold uppercase block">
                Next Follow-up
              </span>
              <p className="font-semibold text-slate-800 truncate">
                {currentLead.nextFollowUp
                  ? formatDate(currentLead.nextFollowUp.toDate(), 'MMM d, h:mm a')
                  : 'None scheduled'}
              </p>
            </div>
          </div>

          {currentLead.notes && (
            <div className="col-span-2 pt-2 border-t border-slate-200/70">
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Notes</span>
              <p className="text-slate-700 italic mt-0.5">&ldquo;{currentLead.notes}&rdquo;</p>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 4. PRIMARY TELECALLING ACTIONS (LARGE TOUCH TARGETS)     */}
        {/* ========================================================= */}
        {callState === 'READY' && (
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleStartCall}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white font-extrabold text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all min-h-[56px]"
            >
              <Phone size={22} className="animate-pulse" />
              <span>Call Student Now</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="py-3 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/70 active:scale-95 transition-all min-h-[44px]"
              >
                <MessageSquare size={16} />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition-all min-h-[44px]"
              >
                <History size={16} />
                <span>History ({activities.length})</span>
              </button>

              <button
                onClick={handleSkipLead}
                className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition-all min-h-[44px]"
              >
                <ChevronRight size={16} />
                <span>Skip Lead</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. CALL OUTCOME SELECTION (MODAL / INLINE DOCK)           */}
      {/* ========================================================= */}
      {(callState === 'OUTCOME' || callState === 'SCHEDULING') && (
        <div className="rounded-2xl border-2 border-blue-500 bg-white p-5 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Post-Call Disposition
              </p>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                Record Outcome for {currentLead.name}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Call Time: {formatTimer(callDuration)}
            </span>
          </div>

          {/* Outcome Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
              1. Select Strict Call Outcome:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OUTCOME_OPTIONS.map((opt) => {
                const isSelected = selectedOutcome === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOutcome(opt.id)}
                    className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between min-h-[56px] ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : opt.color
                    }`}
                  >
                    <span className="font-bold text-sm block">{opt.label}</span>
                    <span
                      className={`text-[10px] mt-0.5 line-clamp-1 ${
                        isSelected ? 'text-blue-100' : 'opacity-80'
                      }`}
                    >
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up Scheduling Section (When outcome requires callback) */}
          {selectedOutcome &&
            ['INTERESTED', 'CALL_LATER', 'CONVERTED'].includes(selectedOutcome) && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} /> 2. Schedule Follow-up (Mandatory):
                  </label>
                  <span className="text-[11px] text-blue-700 font-semibold">
                    {followUpDate
                      ? formatDate(new Date(followUpDate), 'EEE, MMM d, h:mm a')
                      : 'Choose slot'}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FOLLOWUP_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPresetFollowup(p)}
                      className="py-2 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-xs font-semibold hover:bg-blue-100 active:scale-95 transition-all text-center"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Or select custom date & time:
                  </label>
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => {
                      setCustomDateTime(e.target.value);
                      if (e.target.value) setFollowUpDate(new Date(e.target.value).toISOString());
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

          {/* Mandatory Call Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
              3. Call Discussion Notes (Mandatory):
            </label>
            <textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Record summary of conversation (student course preference, fee queries, campus visit commitment)..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 4. Optional WhatsApp Follow-up Message */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-emerald-600" />
                4. WhatsApp Follow-Up Message (Optional):
              </label>
              {selectedWhatsAppTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWhatsAppTemplate(null);
                    setHasSentWhatsApp(false);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Optionally select a template to send personalized admission info or collateral directly to {currentLead.name}.
            </p>

            {/* Template Selection Chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedWhatsAppTemplate(null);
                  setHasSentWhatsApp(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  !selectedWhatsAppTemplate
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                None (Skip)
              </button>

              {templates.map((tpl) => {
                const isSelected = selectedWhatsAppTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedWhatsAppTemplate(tpl);
                      setHasSentWhatsApp(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{tpl.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Template Live Preview Card */}
            {selectedWhatsAppTemplate && (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>Personalized Preview for {currentLead.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const link = getWhatsAppLink(
                        currentLead,
                        selectedWhatsAppTemplate,
                        employee ? { name: employee.name, phone: employee.phone } : undefined
                      );
                      window.open(link, '_blank');
                      setHasSentWhatsApp(true);
                      toast.success('WhatsApp opened in new tab');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                  >
                    <Send size={12} />
                    <span>{hasSentWhatsApp ? 'Opened (Click to Re-send)' : 'Send via WhatsApp'}</span>
                  </button>
                </div>

                <div className="bg-white rounded-lg p-3 border border-emerald-100 text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {generateWhatsAppMessage(
                    selectedWhatsAppTemplate,
                    currentLead,
                    employee ? { name: employee.name, phone: employee.phone } : undefined
                  )}
                </div>

                <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                  <span>💡</span>
                  <span>
                    {hasSentWhatsApp
                      ? 'WhatsApp was opened. When you save outcome, it will proceed to the next lead.'
                      : 'You can send it now with the button above, or it will open automatically when you click "Save Outcome & Load Next".'}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setCallState('READY');
                setSelectedWhatsAppTemplate(null);
                setHasSentWhatsApp(false);
              }}
              className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOutcome}
              disabled={isSubmitting || !selectedOutcome}
              className="flex-1 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={18} /> Save Outcome & Load Next
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. WHATSAPP TEMPLATES MODAL / BOTTOM SHEET               */}
      {/* ========================================================= */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <MessageSquare size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Send WhatsApp Collateral</h3>
                  <p className="text-[11px] text-slate-400">To {currentLead.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select a collateral template to open pre-filled in your WhatsApp client:
            </p>

            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No templates found. Sending generic greeting.
                </div>
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSendWhatsApp(tpl)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-800 block group-hover:text-emerald-700">
                        {tpl.name}
                      </span>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.content}
                      </p>
                    </div>
                    <Send size={15} className="text-slate-300 group-hover:text-emerald-600 shrink-0" />
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. LEAD INTERACTION HISTORY MODAL / BOTTOM SHEET         */}
      {/* ========================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <History size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Call & Activity History</h3>
                  <p className="text-[11px] text-slate-400">Timeline for {currentLead.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No previous call activities recorded for this lead.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        {act.outcome ? act.outcome.replace('_', ' ') : act.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(act.timestamp?.toDate ? act.timestamp.toDate() : new Date(), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {act.duration !== undefined && act.duration > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Call Duration: {act.duration} seconds ({Math.floor(act.duration / 60)}m {act.duration % 60}s)
                      </p>
                    )}
                    {act.note && <p className="text-slate-600 italic mt-1">&ldquo;{act.note}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
            >
              Close History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CounsellorWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <CounsellorWorkspaceContent />
    </Suspense>
  );
}
