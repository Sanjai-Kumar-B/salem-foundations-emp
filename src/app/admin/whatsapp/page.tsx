'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  Check,
  X,
  Smartphone,
  Tag,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, LoadingSpinner } from '@/components/ui';
import {
  getAllWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '@/lib/firestore';
import { WhatsAppTemplate } from '@/types';

const CATEGORIES = [
  { id: 'ALL', label: 'All Templates' },
  { id: 'FOLLOW_UP', label: 'Follow-up' },
  { id: 'COURSE', label: 'Course Details' },
  { id: 'FEES', label: 'Fees & Scholarships' },
  { id: 'CAMPUS', label: 'Campus Visit' },
  { id: 'ADMISSION', label: 'Admission Link' },
];

const VARIABLE_PILLS = [
  { tag: '{name}', label: 'Student Name', sample: 'Kavitha' },
  { tag: '{course}', label: 'Course', sample: 'B.Tech Artificial Intelligence' },
  { tag: '{location}', label: 'City/Location', sample: 'Salem' },
  { tag: '{district}', label: 'District', sample: 'Salem District' },
  { tag: '{counsellorName}', label: 'Counsellor Name', sample: 'Priya Sharma' },
  { tag: '{counsellorPhone}', label: 'Counsellor Phone', sample: '+91 98765 43210' },
  { tag: '{applicationNumber}', label: 'Application No.', sample: 'APP-2026-881' },
];

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'FOLLOW_UP',
    content: '',
    isActive: true,
  });

  // Simulator / Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getAllWhatsAppTemplates(false);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load WhatsApp templates', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'FOLLOW_UP',
      content:
        'Dear {name}, thank you for speaking with our counsellor. Here are the details regarding {course} at Salem Foundations: https://salemfoundations.org. Feel free to contact me at {counsellorPhone} ({counsellorName}).',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: WhatsAppTemplate) => {
    setEditingTemplate(tpl);
    setFormData({
      name: tpl.name,
      category: tpl.category || 'FOLLOW_UP',
      content: tpl.content,
      isActive: tpl.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleInsertVariable = (variableTag: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content ? `${prev.content} ${variableTag}` : variableTag,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Template name is required.');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Message content is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await updateWhatsAppTemplate(editingTemplate.id, {
          name: formData.name.trim(),
          category: formData.category,
          content: formData.content.trim(),
          isActive: formData.isActive,
        });
        toast.success('Template updated successfully!');
      } else {
        await createWhatsAppTemplate({
          name: formData.name.trim(),
          category: formData.category,
          content: formData.content.trim(),
          isActive: formData.isActive,
        });
        toast.success('New template published to employee portal!');
      }
      setIsModalOpen(false);
      await loadTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (tpl: WhatsAppTemplate) => {
    const nextState = !tpl.isActive;
    try {
      await updateWhatsAppTemplate(tpl.id, { isActive: nextState });
      setTemplates((prev) =>
        prev.map((item) => (item.id === tpl.id ? { ...item, isActive: nextState } : item))
      );
      toast.success(
        nextState
          ? 'Template activated for counsellors!'
          : 'Template deactivated and hidden from counsellors.'
      );
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (tpl: WhatsAppTemplate) => {
    if (!confirm(`Are you sure you want to delete "${tpl.name}"? Counsellors will no longer be able to use it.`)) {
      return;
    }

    try {
      await deleteWhatsAppTemplate(tpl.id);
      setTemplates((prev) => prev.filter((item) => item.id !== tpl.id));
      toast.success('Template deleted.');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Template copied to clipboard!');
  };

  // Preview replacement helper
  const renderPreviewMessage = (content: string) => {
    let preview = content;
    VARIABLE_PILLS.forEach((p) => {
      const regex = new RegExp(p.tag.replace('{', '\\{').replace('}', '\\}'), 'gi');
      preview = preview.replace(regex, p.sample);
    });
    return preview;
  };

  // Highlight variables in content view
  const renderContentWithHighlights = (content: string) => {
    const parts = content.split(/(\{[a-zA-Z0-9_]+\})/g);
    return (
      <span className="leading-relaxed">
        {parts.map((part, index) => {
          if (part.startsWith('{') && part.endsWith('}')) {
            return (
              <span
                key={index}
                className="inline-block bg-emerald-100 text-emerald-800 font-bold px-1 rounded text-[11px] mx-0.5 border border-emerald-300"
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (categoryFilter !== 'ALL' && tpl.category !== categoryFilter) {
        return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return tpl.name.toLowerCase().includes(q) || tpl.content.toLowerCase().includes(q);
    });
  }, [templates, categoryFilter, search]);

  const activeCount = templates.filter((t) => t.isActive !== false).length;
  const inactiveCount = templates.length - activeCount;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 relative pb-28">
      <div className="max-w-[1700px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                WhatsApp Message Templates
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Create and manage official templates. Active messages sync directly to the employee portal for post-call follow-ups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <Button
              onClick={loadTemplates}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              Refresh
            </Button>

            <Button
              onClick={openCreateModal}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Templates
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{templates.length}</div>
            <p className="text-xs text-slate-400 mt-1">Configured institutional messages</p>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active in Employee Portal
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600">{activeCount}</div>
            <p className="text-xs text-slate-400 mt-1">Available to counsellors immediately</p>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Draft / Inactive
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-700">{inactiveCount}</div>
            <p className="text-xs text-slate-400 mt-1">Hidden from telecalling workspace</p>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Supported Variables
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-indigo-600">{VARIABLE_PILLS.length}</div>
            <p className="text-xs text-slate-400 mt-1">Auto-substituted per student & staff</p>
          </Card>
        </div>

        {/* Dynamic Variables Guide Card */}
        <Card className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 to-blue-50/70 p-4 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800">Dynamic Personalization Tags:</span>
                <p className="text-[11px] text-slate-500">
                  Include these tags in your template. The system automatically replaces them with student and calling counsellor information.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_PILLS.map((v) => (
                <button
                  key={v.tag}
                  onClick={() => handleCopy(v.tag)}
                  title={`Click to copy: ${v.label} (e.g. ${v.sample})`}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                >
                  <span className="text-emerald-600 font-mono">{v.tag}</span>
                  <span className="text-[10px] text-slate-400">({v.label})</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates by name or text..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-semibold text-slate-500 animate-pulse">
              Loading WhatsApp templates...
            </p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border border-slate-200 bg-white">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No WhatsApp Templates Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search
                ? 'No templates match your search query. Try clearing filters.'
                : 'Get started by creating your first WhatsApp template for counsellors.'}
            </p>
            <div className="mt-4">
              <Button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Template
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => {
              const isActive = tpl.isActive !== false;

              return (
                <Card
                  key={tpl.id}
                  className={`rounded-2xl border-2 transition-all p-5 flex flex-col justify-between bg-white shadow-xs hover:shadow-md ${
                    isActive
                      ? 'border-slate-200/90 hover:border-emerald-300'
                      : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  {/* Top: Name, Category, Status Switch */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              tpl.category === 'FEES'
                                ? 'bg-amber-100 text-amber-800'
                                : tpl.category === 'CAMPUS'
                                ? 'bg-indigo-100 text-indigo-800'
                                : tpl.category === 'ADMISSION'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tpl.category || 'FOLLOW_UP'}
                          </span>

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">
                          {tpl.name}
                        </h3>
                      </div>

                      {/* Active/Inactive Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(tpl)}
                        title={isActive ? 'Deactivate template' : 'Activate template'}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                          isActive ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* WhatsApp Chat Bubble Display */}
                    <div className="bg-[#e7f8ee] p-3.5 rounded-xl border border-[#c1e9cf] text-xs text-slate-800 relative mt-3 shadow-2xs font-normal">
                      <div className="text-[11.5px] leading-relaxed line-clamp-6">
                        {renderContentWithHighlights(tpl.content)}
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-emerald-800/60 font-semibold">
                        <span>12:30 PM</span>
                        <Check className="w-3 h-3 text-emerald-700" />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      {/* Preview Button */}
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        title="Live WhatsApp Preview Simulator"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-1 transition-colors text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(tpl.content)}
                        title="Copy message text"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 font-bold flex items-center gap-1 transition-colors text-[11px]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(tpl)}
                        title="Edit template"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(tpl)}
                        title="Delete template"
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ADD / EDIT TEMPLATE MODAL                                */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingTemplate ? 'Edit WhatsApp Template' : 'Create New WhatsApp Template'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Templates will appear in counsellors’ telecalling workspace.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Post-Call Course Prospectus"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="FOLLOW_UP">Follow-up Call</option>
                    <option value="COURSE">Course Details & Syllabus</option>
                    <option value="FEES">Fees & Scholarship</option>
                    <option value="CAMPUS">Campus Visit Invitation</option>
                    <option value="ADMISSION">Admission Form Link</option>
                    <option value="GENERAL">General Notice</option>
                  </select>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Message Content *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {formData.content.length} characters
                  </span>
                </div>

                {/* Quick Variable Injectors */}
                <div className="mb-2 flex flex-wrap items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 mr-1">Insert Variable:</span>
                  {VARIABLE_PILLS.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-all active:scale-95"
                    >
                      +{v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type the WhatsApp message template here. Use {name}, {course}, {counsellorName}, etc. for dynamic substitution."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tpl-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="tpl-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Activate template immediately in Counsellor Workspace
                </label>
              </div>

              {/* Live Preview Box */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 mb-1 block">
                  Live Preview (with sample student data):
                </span>
                <div className="bg-[#efeae2] p-4 rounded-2xl border border-[#d1d7db] shadow-inner">
                  <div className="max-w-md bg-[#d9fdd3] p-3.5 rounded-2xl shadow-xs text-xs text-slate-900 border border-[#b2e2ab]">
                    <div className="text-[11.5px] leading-relaxed whitespace-pre-wrap">
                      {renderPreviewMessage(formData.content) || (
                        <span className="text-slate-400 italic">Enter message content to preview...</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-900/60 font-semibold">
                      <span>Just now</span>
                      <Check className="w-3 h-3 text-emerald-700" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {editingTemplate ? 'Save Changes' : 'Publish Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHONE SIMULATOR PREVIEW MODAL                             */}
      {/* ========================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">WhatsApp Student View</h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Phone Shell */}
            <div className="bg-[#128c7e] text-white p-3 rounded-t-2xl flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-white text-emerald-800 font-bold flex items-center justify-center text-xs">
                SF
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate">Salem Foundations</div>
                <div className="text-[10px] text-emerald-100">Official Admissions Desk</div>
              </div>
            </div>

            <div className="bg-[#efeae2] p-4 rounded-b-2xl min-h-[220px] flex flex-col justify-end">
              <div className="bg-[#d9fdd3] p-3.5 rounded-2xl shadow-xs text-xs text-slate-900 border border-[#b2e2ab]">
                <p className="text-[11.5px] leading-relaxed whitespace-pre-wrap">
                  {renderPreviewMessage(previewTemplate.content)}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-emerald-900/60 font-semibold">
                  <span>10:45 AM</span>
                  <Check className="w-3 h-3 text-emerald-700" />
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                handleCopy(previewTemplate.content);
                setPreviewTemplate(null);
              }}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Template Text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
