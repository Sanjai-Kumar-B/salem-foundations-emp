'use client';

import React from 'react';
import { PhoneIncoming, CalendarCheck, MessageCircle, ChevronLeft, ChevronRight, Check, Target } from 'lucide-react';

type TabKey = 'queue' | 'calls' | 'followups' | 'whatsapp';

interface MobileDockProps {
  active?: TabKey;
  onChange?: (tab: TabKey) => void;
  onPrimaryAction?: () => void; // Calls
  inCallMode?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
}

export default function MobileDock({
  active = 'calls',
  onChange,
  onPrimaryAction,
  inCallMode = false,
  onPrev,
  onNext,
  onSubmit,
}: MobileDockProps) {
  if (inCallMode) {
    return (
      <div className="lg:hidden fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-md border border-white/30 shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={onPrev}
            className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95"
          >
            <ChevronLeft size={18} />
            <div className="text-xs">Previous</div>
          </button>

          <button
            onClick={onSubmit}
            className="mx-1 flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3 py-2 text-sm font-bold text-white shadow-lg active:scale-95"
          >
            <Check size={18} />
            <div className="text-xs">Submit Outcome</div>
          </button>

          <button
            onClick={onNext}
            className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95"
          >
            <ChevronRight size={18} />
            <div className="text-xs">Next Lead</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-md border border-white/30 shadow-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange?.('queue')}
            aria-pressed={active === 'queue'}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
              active === 'queue'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Target size={20} />
            <span className="text-[11px] font-semibold">Queue</span>
          </button>
        </div>

        <div className="-mt-6 flex items-center justify-center">
          <button
            onClick={onPrimaryAction}
            aria-label="Calls"
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 shadow-[0_8px_30px_rgba(88,100,242,0.35)] transition-transform active:scale-95"
          >
            <div className="absolute inset-0 rounded-full opacity-40 blur-xl" />
            <PhoneIncoming size={24} className="text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange?.('followups')}
            aria-pressed={active === 'followups'}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
              active === 'followups'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarCheck size={20} />
            <span className="text-[11px] font-semibold">Follow-ups</span>
          </button>

          <button
            onClick={() => onChange?.('whatsapp')}
            aria-pressed={active === 'whatsapp'}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
              active === 'whatsapp'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-[11px] font-semibold">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
