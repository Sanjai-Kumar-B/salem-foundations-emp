'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getLeadsByEmployee } from '@/lib/firestore';
import { formatDate, formatPhone, cn } from '@/lib/utils';
import { getDirectWhatsAppLink } from '@/lib/whatsapp';
import { Lead } from '@/types';
import {
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabType = 'ALL' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED';

interface CategorizedLead {
  lead: Lead;
  category: 'OVERDUE' | 'UPCOMING' | 'COMPLETED';
  dueText: string;
  isOverdue: boolean;
}

export default function TodaysCallsPage() {
  const { employee } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (silent = false) => {
    if (!employee) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const assigned = await getLeadsByEmployee(employee.id);
      setLeads(assigned);
    } catch (err) {
      console.error('Failed to load calls queue', err);
      toast.error('Failed to load today calls');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employee]);

  // Categorize leads into Overdue, Upcoming, Completed
  const categorizedLeads: CategorizedLead[] = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return leads.map((lead) => {
      const followUpTime = lead.nextFollowUp?.toDate ? lead.nextFollowUp.toDate().getTime() : null;
      const lastOutcome = lead.lastOutcome ?? lead.status;

      const isTerminal = lead.status === 'CONVERTED';
      const hasRecentContact = lead.lastActivityAt && lead.lastActivityAt.toDate().getTime() >= startOfToday.getTime();

      let category: 'OVERDUE' | 'UPCOMING' | 'COMPLETED' = 'UPCOMING';
      let dueText = 'Scheduled';
      let isOverdue = false;

      if (isTerminal || (hasRecentContact && !followUpTime)) {
        category = 'COMPLETED';
        dueText = `Completed (${lastOutcome?.replace(/_/g, ' ') || 'Done'})`;
      } else if (followUpTime) {
        const diffMinutes = Math.round((followUpTime - now) / 60000);
        if (diffMinutes < 0) {
          category = 'OVERDUE';
          isOverdue = true;
          const hours = Math.floor(Math.abs(diffMinutes) / 60);
          const mins = Math.abs(diffMinutes) % 60;
          dueText = hours > 0 ? `Overdue by ${hours}h ${mins}m` : `Overdue by ${mins}m`;
        } else if (diffMinutes <= 60) {
          category = 'UPCOMING';
          dueText = `Due in ${diffMinutes} mins`;
        } else {
          category = 'UPCOMING';
          const dt = lead.nextFollowUp?.toDate ? lead.nextFollowUp.toDate() : new Date();
          dueText = formatDate(dt, 'MMM d, h:mm a');
        }
      } else if (lead.status === 'NEW') {
        category = 'UPCOMING';
        dueText = 'New Lead — Ready for Call';
      } else {
        category = 'UPCOMING';
        dueText = 'Pending Follow-up';
      }

      return {
        lead,
        category,
        dueText,
        isOverdue,
      };
    });
  }, [leads]);

  // Filter by tab and search
  const filteredLeads = useMemo(() => {
    return categorizedLeads.filter((item) => {
      if (activeTab === 'OVERDUE' && item.category !== 'OVERDUE') return false;
      if (activeTab === 'UPCOMING' && item.category !== 'UPCOMING') return false;
      if (activeTab === 'COMPLETED' && item.category !== 'COMPLETED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = item.lead.name?.toLowerCase() || '';
        const phone = item.lead.mobile?.toLowerCase() || '';
        const course = item.lead.course?.toLowerCase() || '';
        const location = (item.lead.district || item.lead.location || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || course.includes(q) || location.includes(q);
      }

      return true;
    });
  }, [categorizedLeads, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: categorizedLeads.length,
      overdue: categorizedLeads.filter((l) => l.category === 'OVERDUE').length,
      upcoming: categorizedLeads.filter((l) => l.category === 'UPCOMING').length,
      completed: categorizedLeads.filter((l) => l.category === 'COMPLETED').length,
    };
  }, [categorizedLeads]);

  const handleCallLead = (leadId: string) => {
    router.push(`/counsellor/workspace?leadId=${leadId}`);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-600" />
            Today&apos;s Calls
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time scheduled calls and callbacks queue
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all active:scale-95"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin text-blue-600')} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, phone, course..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>All Calls</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'OVERDUE'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Overdue
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'OVERDUE' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
            )}
          >
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'UPCOMING'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Upcoming</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'UPCOMING' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'COMPLETED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Completed</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
            )}
          >
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-3">
              <div className="h-5 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded w-full mt-2" />
            </div>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No calls in this category</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? `No students found matching "${searchQuery}".`
              : activeTab === 'OVERDUE'
              ? 'Awesome! You have zero overdue follow-ups right now.'
              : 'Your scheduled calls queue is clean for now.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(({ lead, category, dueText, isOverdue }) => {
            const waLink = getDirectWhatsAppLink(lead.mobile, `Hello ${lead.name}, this is regarding your admission inquiry.`);

            return (
              <div
                key={lead.id}
                className={cn(
                  'p-4 bg-white rounded-2xl border transition-all shadow-2xs hover:shadow-md relative overflow-hidden',
                  isOverdue
                    ? 'border-l-4 border-l-rose-500 border-rose-200/80 bg-rose-50/20'
                    : category === 'COMPLETED'
                    ? 'border-l-4 border-l-emerald-500 border-slate-200'
                    : 'border-l-4 border-l-blue-600 border-slate-200/90'
                )}
              >
                {/* Header row: Name, priority badge, and status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate">{lead.name}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border',
                          getPriorityBadge(lead.priority)
                        )}
                      >
                        {lead.priority || 'MEDIUM'}
                      </span>
                      {lead.status === 'INTERESTED' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Flame className="w-3 h-3 text-emerald-600" />
                          Interested
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      {lead.course && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800">{lead.course}</span>
                        </span>
                      )}
                      {(lead.district || lead.location) && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {lead.district || lead.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Due time tag */}
                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                        isOverdue
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : category === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {dueText}
                    </span>
                  </div>
                </div>

                {/* Contact row & Notes */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={`tel:${lead.mobile}`}
                    className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-blue-600"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatPhone(lead.mobile)}</span>
                  </a>

                  {lead.lastOutcome && (
                    <span className="text-[11px] text-slate-500">
                      Last: <strong className="text-slate-700">{lead.lastOutcome.replace(/_/g, ' ')}</strong>
                    </span>
                  )}
                </div>

                {/* Actions row: Call Now + WhatsApp */}
                <div className="mt-3.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCallLead(lead.id)}
                    className="h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call in Workspace</span>
                  </button>

                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 active:scale-[0.98] transition-all"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
