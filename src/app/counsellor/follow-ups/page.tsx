'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getTodaysTasks, getOverdueTasks } from '@/lib/firestore';
import { formatDate, cn } from '@/lib/utils';
import { Task } from '@/types';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Search,
  RefreshCw,
  X,
  ChevronRight,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabType = 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED';

const RESCHEDULE_SHORTCUTS = [
  { label: 'Later Today (+3h)', getHours: () => 3 },
  { label: 'Tomorrow Morning (10 AM)', getDays: () => 1, setHour: 10 },
  { label: 'In 2 Days (10 AM)', getDays: () => 2, setHour: 10 },
  { label: 'Next Week', getDays: () => 7, setHour: 10 },
];

export default function CounsellorFollowUpsPage() {
  const { employee } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reschedule modal
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [customDateTime, setCustomDateTime] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  const loadData = async (silent = false) => {
    if (!employee) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [todayTasks, overdueTasks] = await Promise.all([
        getTodaysTasks(employee.id),
        getOverdueTasks(employee.id),
      ]);

      // Combine unique tasks
      const map = new Map<string, Task>();
      overdueTasks.forEach((t) => map.set(t.id, t));
      todayTasks.forEach((t) => map.set(t.id, t));

      // Also fetch completed tasks if any
      try {
        const res = await fetch('/api/tasks?status=COMPLETED');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tasks)) {
            data.tasks.forEach((t: any) => {
              if (t.employeeId === employee.id || t.assignedEmployeeId === employee.id) {
                map.set(t.id, t);
              }
            });
          }
        }
      } catch (err) {
        console.warn('Completed tasks fetch ignored', err);
      }

      setTasks(Array.from(map.values()));
    } catch (err) {
      console.error('Failed to load follow-up tasks', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employee]);

  // Mark task completed
  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete task');
      }

      toast.success('Task marked as completed!');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'COMPLETED' } : t))
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not complete task');
    }
  };

  // Reschedule task
  const handleSaveReschedule = async (newDueDate: Date) => {
    if (!rescheduleTask) return;
    setSavingReschedule(true);
    try {
      const res = await fetch(`/api/tasks/${rescheduleTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: newDueDate.toISOString(),
          status: 'PENDING',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reschedule');
      }

      toast.success('Follow-up rescheduled successfully!');
      setRescheduleTask(null);
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || 'Could not reschedule task');
    } finally {
      setSavingReschedule(false);
    }
  };

  // Categorize tasks
  const categorizedTasks = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return tasks.map((task) => {
      const dueTime = (task.dueDate as any)?.toDate
        ? (task.dueDate as any).toDate().getTime()
        : task.dueDate
        ? new Date(task.dueDate as any).getTime()
        : null;

      let category: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' = 'TODAY';
      let isOverdue = false;
      let dueText = 'Scheduled';

      if (task.status === 'COMPLETED') {
        category = 'COMPLETED';
        dueText = 'Completed';
      } else if (dueTime) {
        if (dueTime < startOfToday.getTime()) {
          category = 'OVERDUE';
          isOverdue = true;
          dueText = `Overdue (${formatDate(new Date(dueTime), 'MMM d')})`;
        } else if (dueTime >= startOfToday.getTime() && dueTime <= endOfToday.getTime()) {
          category = 'TODAY';
          if (dueTime < now) {
            isOverdue = true;
            dueText = `Today (${formatDate(new Date(dueTime), 'h:mm a')}) - Overdue`;
          } else {
            dueText = `Today at ${formatDate(new Date(dueTime), 'h:mm a')}`;
          }
        } else {
          category = 'UPCOMING';
          dueText = formatDate(new Date(dueTime), 'MMM d, h:mm a');
        }
      }

      return {
        task,
        category,
        isOverdue,
        dueText,
      };
    });
  }, [tasks]);

  // Filter by tab and search
  const filteredTasks = useMemo(() => {
    return categorizedTasks.filter((item) => {
      if (activeTab === 'OVERDUE' && item.category !== 'OVERDUE') return false;
      if (activeTab === 'TODAY' && item.category !== 'TODAY') return false;
      if (activeTab === 'UPCOMING' && item.category !== 'UPCOMING') return false;
      if (activeTab === 'COMPLETED' && item.category !== 'COMPLETED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (item.task.leadName || '').toLowerCase();
        const desc = (item.task.description || '').toLowerCase();
        const notes = (item.task.notes || '').toLowerCase();
        return name.includes(q) || desc.includes(q) || notes.includes(q);
      }

      return true;
    });
  }, [categorizedTasks, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: categorizedTasks.length,
      overdue: categorizedTasks.filter((t) => t.category === 'OVERDUE').length,
      today: categorizedTasks.filter((t) => t.category === 'TODAY').length,
      upcoming: categorizedTasks.filter((t) => t.category === 'UPCOMING').length,
      completed: categorizedTasks.filter((t) => t.category === 'COMPLETED').length,
    };
  }, [categorizedTasks]);

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Follow-ups & Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your callbacks, follow-ups, and pending tasks
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name or notes..."
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

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>All Tasks</span>
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
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
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
          onClick={() => setActiveTab('TODAY')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'TODAY'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <span>Today</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'TODAY' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {counts.today}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={cn(
            'px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all',
            activeTab === 'UPCOMING'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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

      {/* Task List */}
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
      ) : filteredTasks.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No tasks in this view</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? `No follow-ups matching "${searchQuery}".`
              : activeTab === 'OVERDUE'
              ? 'Great work! No overdue tasks pending.'
              : 'All your follow-up tasks are up to date.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(({ task, category, isOverdue, dueText }) => {
            const isCompleted = task.status === 'COMPLETED';

            return (
              <div
                key={task.id}
                className={cn(
                  'p-4 bg-white rounded-2xl border transition-all shadow-2xs hover:shadow-md relative overflow-hidden',
                  isCompleted
                    ? 'border-l-4 border-l-emerald-500 bg-slate-50/50'
                    : isOverdue
                    ? 'border-l-4 border-l-rose-500 bg-rose-50/20 border-rose-200/80'
                    : 'border-l-4 border-l-blue-600 border-slate-200/90'
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={cn(
                          'text-base font-bold truncate',
                          isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                        )}
                      >
                        {task.leadName || 'Student Lead'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {task.taskType || 'FOLLOW_UP'}
                      </span>
                    </div>

                    {task.description && (
                      <p className="mt-1 text-xs text-slate-600">{task.description}</p>
                    )}
                    {task.notes && (
                      <p className="mt-1 text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        &ldquo;{task.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Due tag */}
                  <div className="shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {dueText}
                    </span>
                  </div>
                </div>

                {/* Actions row: 3 actions with minimum 44px touch height */}
                {!isCompleted && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => router.push(`/counsellor/workspace?leadId=${task.leadId}`)}
                      className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Now</span>
                    </button>

                    <button
                      onClick={() => setRescheduleTask(task)}
                      className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 active:scale-[0.98] transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reschedule</span>
                    </button>

                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 active:scale-[0.98] transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Complete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Bottom Sheet / Modal */}
      {rescheduleTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Reschedule Follow-up</h3>
              <button
                onClick={() => setRescheduleTask(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select when you would like to follow up with <strong>{rescheduleTask.leadName}</strong>.
            </p>

            {/* Quick shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              {RESCHEDULE_SHORTCUTS.map((item) => (
                <button
                  key={item.label}
                  disabled={savingReschedule}
                  onClick={() => {
                    const d = new Date();
                    if (item.getHours) d.setHours(d.getHours() + item.getHours());
                    if (item.getDays) d.setDate(d.getDate() + item.getDays());
                    if (item.setHour) d.setHours(item.setHour, 0, 0, 0);
                    handleSaveReschedule(d);
                  }}
                  className="p-3 text-left rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-xs font-semibold text-slate-800 transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Date Time */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Or choose custom date & time:
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setRescheduleTask(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!customDateTime || savingReschedule}
                onClick={() => {
                  if (customDateTime) {
                    handleSaveReschedule(new Date(customDateTime));
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 disabled:opacity-50 text-xs font-semibold text-white shadow-sm"
              >
                {savingReschedule ? 'Saving...' : 'Save New Time'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
