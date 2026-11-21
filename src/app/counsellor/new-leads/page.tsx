'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getLeadsByEmployee } from '@/lib/firestore';
import { formatDate, formatPhone, cn } from '@/lib/utils';
import { getDirectWhatsAppLink } from '@/lib/whatsapp';
import { Lead } from '@/types';
import {
  Sparkles,
  Phone,
  PhoneCall,
  Search,
  RefreshCw,
  MessageSquare,
  GraduationCap,
  MapPin,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

type PriorityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

export default function CounsellorNewLeadsPage() {
  const { employee } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  const loadData = async (silent = false) => {
    if (!employee) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const assigned = await getLeadsByEmployee(employee.id);
      // Filter for uncontacted / NEW leads
      const newOnly = assigned.filter((l) => l.status === 'NEW');
      setLeads(newOnly);
    } catch (err) {
      console.error('Failed to load new leads', err);
      toast.error('Failed to load new leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employee]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Priority filter
      if (priorityFilter !== 'ALL') {
        const leadPri = (lead.priority || 'MEDIUM').toUpperCase();
        if (leadPri !== priorityFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (lead.name || '').toLowerCase();
        const phone = (lead.mobile || '').toLowerCase();
        const course = (lead.course || '').toLowerCase();
        const loc = (lead.district || lead.location || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || course.includes(q) || loc.includes(q);
      }

      return true;
    });
  }, [leads, priorityFilter, searchQuery]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            New Leads Pool
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Uncontacted leads assigned directly to your queue
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

      {/* Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
            Uncontacted Leads
          </span>
          <div className="text-2xl font-black mt-0.5">{leads.length} Students</div>
        </div>
        <button
          onClick={() => {
            if (leads.length > 0) {
              router.push(`/counsellor/workspace?leadId=${leads[0].id}`);
            }
          }}
          disabled={leads.length === 0}
          className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-sm disabled:opacity-50 active:scale-95 transition-all"
        >
          Start Calling
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search new leads by name, course, district..."
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

      {/* Priority Filters */}
      <div className="flex gap-2 text-xs font-semibold overflow-x-auto pb-1 no-scrollbar">
        {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as PriorityFilter[]).map((pri) => (
          <button
            key={pri}
            onClick={() => setPriorityFilter(pri)}
            className={cn(
              'px-3.5 py-2 rounded-xl border transition-all shrink-0',
              priorityFilter === pri
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            {pri === 'ALL' ? 'All Priorities' : `${pri} Priority`}
          </button>
        ))}
      </div>

      {/* Lead Cards List */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-3">
              <div className="h-5 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-10 bg-slate-100 rounded w-full mt-2" />
            </div>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery || priorityFilter !== 'ALL'
              ? 'No matching new leads'
              : 'All caught up!'}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery || priorityFilter !== 'ALL'
              ? 'Try modifying your search or priority filter.'
              : 'You have no uncontacted leads waiting right now. Check today calls or follow-ups!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const waLink = getDirectWhatsAppLink(
              lead.mobile,
              `Hello ${lead.name}, greetings from Salem Foundations. We received your admission inquiry.`
            );

            return (
              <div
                key={lead.id}
                className="p-4 bg-white rounded-2xl border border-l-4 border-l-blue-600 border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3"
              >
                {/* Header: Name, priority badge, creation date */}
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        NEW
                      </span>
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

                  {lead.createdAt && (
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {formatDate(lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(), 'MMM d')}
                    </span>
                  )}
                </div>

                {/* Phone contact */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={`tel:${lead.mobile}`}
                    className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-blue-600"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatPhone(lead.mobile)}</span>
                  </a>

                  {lead.source && (
                    <span className="text-[11px] text-slate-400">
                      Source: <strong className="text-slate-600">{lead.source}</strong>
                    </span>
                  )}
                </div>

                {/* Actions row: Call in Workspace + WhatsApp (>=44px touch) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => router.push(`/counsellor/workspace?leadId=${lead.id}`)}
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
