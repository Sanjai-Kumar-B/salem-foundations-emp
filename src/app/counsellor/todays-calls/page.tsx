'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Card, LoadingSpinner } from '@/components/ui';
import CallingConsole from '@/components/counsellor/CallingConsole';
import { AlertCircle, ChevronRight, Phone } from 'lucide-react';
import { getLeadsByEmployee } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Lead as FireLead } from '@/types';
import toast from 'react-hot-toast';

type UiLead = {
  id: string;
  name: string;
  phone: string;
  course: string;
  location: string;
  priority: 'high' | 'medium' | 'low';
  temperature: 'hot' | 'warm' | 'cold';
  isOverdue: boolean;
  isDueNow: boolean;
  minutesUntilDue: number;
  lastOutcome?: string;
  conversionProbability?: number;
};

function toUiLead(lead: FireLead): UiLead {
  const now = Date.now();
  const nextAt = lead.nextFollowUp ? lead.nextFollowUp.toDate().getTime() : null;
  const minutesUntilDue = nextAt ? Math.round((nextAt - now) / 60000) : 9999;
  const isOverdue = nextAt !== null && minutesUntilDue < 0;
  const isDueNow = nextAt !== null && minutesUntilDue >= 0 && minutesUntilDue <= 10;

  const priority =
    lead.priority === 'HIGH' ? 'high' : lead.priority === 'LOW' ? 'low' : 'medium';

  const temperature: UiLead['temperature'] =
    lead.status === 'INTERESTED' ? 'hot' : lead.status === 'CONTACTED' ? 'warm' : 'cold';

  const probability =
    temperature === 'hot' ? 90 : temperature === 'warm' ? 65 : 35;

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.mobile,
    course: lead.course ?? 'Not specified',
    location: lead.location ?? lead.district ?? 'Unknown',
    priority,
    temperature,
    isOverdue,
    isDueNow,
    minutesUntilDue,
    lastOutcome: lead.lastOutcome ?? lead.status,
    conversionProbability: probability,
  };
}

export default function TodaysCallsPage() {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<UiLead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [callingConsoleOpen, setCallingConsoleOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!employee) return;
      setLoading(true);
      try {
        const assigned = await getLeadsByEmployee(employee.id);
        setLeads(assigned.map(toUiLead));
      } catch (error) {
        console.error('Failed to load today calls', error);
        toast.error('Failed to load today calls');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [employee]);

  const groupedLeads = useMemo(() => {
    return {
      overdue: leads.filter((l) => l.isOverdue),
      dueNow: leads.filter((l) => !l.isOverdue && l.isDueNow),
      nextHour: leads.filter((l) => !l.isOverdue && !l.isDueNow && l.minutesUntilDue <= 60),
      later: leads.filter((l) => !l.isOverdue && !l.isDueNow && l.minutesUntilDue > 60),
    };
  }, [leads]);

  const allLeads = useMemo(
    () => [
      ...groupedLeads.overdue,
      ...groupedLeads.dueNow,
      ...groupedLeads.nextHour,
      ...groupedLeads.later,
    ],
    [groupedLeads]
  );

  const currentLead = allLeads[currentLeadIndex] ?? null;

  const handleOutcome = (leadId: string, outcome: string) => {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, lastOutcome: outcome } : lead)));
  };

  const LeadCard = ({
    lead,
    onClick,
    groupLabel,
  }: {
    lead: UiLead;
    onClick: () => void;
    groupLabel: string;
  }) => {
    const borderClass = lead.priority === 'high' ? 'border-l-red-600' : 'border-l-blue-600';

    return (
      <button
        onClick={onClick}
        className={`w-full rounded-2xl border border-l-4 ${borderClass} border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-slate-900">{lead.name}</h3>
              {lead.temperature === 'hot' && <Badge variant="danger" size="sm">HOT</Badge>}
              {lead.isOverdue && <Badge variant="danger" size="sm">OVERDUE</Badge>}
              {lead.conversionProbability && lead.conversionProbability > 80 && (
                <Badge variant="success" size="sm">{lead.conversionProbability}%</Badge>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-700">{lead.course}</p>
            <p className="mb-2 text-xs text-slate-500">{lead.location}</p>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Phone size={14} className="text-blue-600" />
              <span>{lead.phone}</span>
            </div>

            {lead.isOverdue && (
              <p className="mt-2 text-xs font-semibold text-red-600">{Math.abs(lead.minutesUntilDue)} mins overdue</p>
            )}
            {lead.isDueNow && !lead.isOverdue && (
              <p className="mt-2 text-xs font-semibold text-orange-600">Due in {lead.minutesUntilDue} mins</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <ChevronRight size={20} className="text-slate-300" />
            <p className="text-[10px] font-semibold uppercase text-slate-400">{groupLabel}</p>
          </div>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (callingConsoleOpen && currentLead) {
    return (
      <CallingConsole
        lead={currentLead}
        onNext={() => {
          setCurrentLeadIndex((prev) => Math.min(prev + 1, allLeads.length - 1));
          if (currentLeadIndex >= allLeads.length - 1) {
            setCallingConsoleOpen(false);
          }
        }}
        onPrev={() => setCurrentLeadIndex((prev) => Math.max(prev - 1, 0))}
        onClose={() => setCallingConsoleOpen(false)}
        onOutcome={(outcome) => handleOutcome(currentLead.id, outcome)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Calls</h1>
            <p className="text-sm text-gray-500">Live queue from assigned Firebase leads</p>
          </div>
          <Badge variant="info">{allLeads.length} Leads</Badge>
        </div>

        {allLeads.length === 0 && (
          <Card className="p-6 text-center text-sm text-gray-500">No assigned leads in your queue.</Card>
        )}

        {groupedLeads.overdue.length > 0 && (
          <Card className="space-y-3" padding="sm">
            <h2 className="px-1 text-sm font-semibold text-red-700">Overdue</h2>
            {groupedLeads.overdue.map((lead) => (
              <LeadCard key={lead.id} lead={lead} groupLabel="Overdue" onClick={() => {
                const idx = allLeads.findIndex((item) => item.id === lead.id);
                setCurrentLeadIndex(Math.max(idx, 0));
                setCallingConsoleOpen(true);
              }} />
            ))}
          </Card>
        )}

        {groupedLeads.dueNow.length > 0 && (
          <Card className="space-y-3" padding="sm">
            <h2 className="px-1 text-sm font-semibold text-orange-700">Due Now</h2>
            {groupedLeads.dueNow.map((lead) => (
              <LeadCard key={lead.id} lead={lead} groupLabel="Due Now" onClick={() => {
                const idx = allLeads.findIndex((item) => item.id === lead.id);
                setCurrentLeadIndex(Math.max(idx, 0));
                setCallingConsoleOpen(true);
              }} />
            ))}
          </Card>
        )}

        {groupedLeads.nextHour.length > 0 && (
          <Card className="space-y-3" padding="sm">
            <h2 className="px-1 text-sm font-semibold text-blue-700">Next Hour</h2>
            {groupedLeads.nextHour.map((lead) => (
              <LeadCard key={lead.id} lead={lead} groupLabel="Next Hour" onClick={() => {
                const idx = allLeads.findIndex((item) => item.id === lead.id);
                setCurrentLeadIndex(Math.max(idx, 0));
                setCallingConsoleOpen(true);
              }} />
            ))}
          </Card>
        )}

        {groupedLeads.later.length > 0 && (
          <Card className="space-y-3" padding="sm">
            <h2 className="px-1 text-sm font-semibold text-slate-700">Later</h2>
            {groupedLeads.later.map((lead) => (
              <LeadCard key={lead.id} lead={lead} groupLabel="Later" onClick={() => {
                const idx = allLeads.findIndex((item) => item.id === lead.id);
                setCurrentLeadIndex(Math.max(idx, 0));
                setCallingConsoleOpen(true);
              }} />
            ))}
          </Card>
        )}

        {allLeads.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle size={16} />
            Tap any lead card to open the calling console.
          </div>
        )}
      </div>
    </div>
  );
}
