'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Badge, Button, Card } from '@/components/ui';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  assignLeadsToEmployee,
  createLead,
  deleteLead,
  getAllEmployees,
  getAllLeads,
  importLeads,
} from '@/lib/firestore';
import { Employee, Lead, LeadImportData } from '@/types';

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const ten = digits.slice(-10);
  return ten.length === 10 ? ten : '';
}

interface DuplicateReportItem {
  rowNumber: number;
  name: string;
  mobile: string;
  course?: string;
  reason: 'IN_DATABASE' | 'FILE_DUPLICATE';
  existingLeadName?: string;
}

function toImportRows(sheetRows: Record<string, unknown>[]): LeadImportData[] {
  return sheetRows
    .map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        const key = String(k).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        normalized[key] = v;
      }

      const name = String(
        normalized['name'] ?? normalized['studentname'] ?? normalized['firstname'] ?? normalized['candidate'] ?? ''
      ).trim();

      const mobile = normalizePhone(
        String(
          normalized['mobile'] ??
            normalized['mobilenumber'] ??
            normalized['phone'] ??
            normalized['contact'] ??
            normalized['phonenumber'] ??
            ''
        )
      );

      const email = String(normalized['email'] ?? normalized['emailaddress'] ?? '').trim() || undefined;
      const course =
        String(normalized['course'] ?? normalized['program'] ?? normalized['branch'] ?? normalized['schoolname'] ?? '').trim() ||
        undefined;

      const addrParts = [
        String(normalized['houseaddress'] ?? '').trim(),
        String(normalized['streetname'] ?? '').trim(),
        String(normalized['areavillage'] ?? '').trim(),
        String(normalized['districtname'] ?? normalized['district'] ?? '').trim(),
        String(normalized['pincode'] ?? '').trim(),
      ].filter(Boolean);
      const location = addrParts.length
        ? addrParts.join(', ')
        : String(normalized['location'] ?? normalized['city'] ?? '') || undefined;

      const notesParts = [
        String(normalized['fathername'] ?? '').trim(),
        String(normalized['school'] ?? '').trim(),
        String(normalized['gender'] ?? '').trim(),
        String(normalized['medinstrdesc'] ?? normalized['medinstr'] ?? '').trim(),
      ].filter(Boolean);
      const notes = notesParts.length
        ? notesParts.join(' | ')
        : String(normalized['notes'] ?? normalized['remarks'] ?? '') || undefined;

      return { name, mobile, email, course, location, notes };
    })
    .filter((row) => !!row.name && !!row.mobile);
}

export default function LeadsWorkspacePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<'ALL' | Lead['status']>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Manual Add Form Modal State (Extended Fields)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    mobile: '',
    email: '',
    fatherName: '',
    course: '',
    district: '',
    location: '',
    school: '',
    gender: 'Male',
    source: 'BULK' as Lead['source'],
    priority: 'MEDIUM' as Lead['priority'],
    applicationNumber: '',
    notes: '',
  });

  // Duplicate prompt on single add
  const [singleAddDuplicateWarning, setSingleAddDuplicateWarning] = useState<string | null>(null);

  // Bulk Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<LeadImportData[]>([]);
  const [duplicatesReport, setDuplicatesReport] = useState<DuplicateReportItem[]>([]);
  const [uniqueImportRows, setUniqueImportRows] = useState<LeadImportData[]>([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLeads, allEmployees] = await Promise.all([getAllLeads(), getAllEmployees(true)]);
      setLeads(allLeads);
      setEmployees(allEmployees);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load leads';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const text = `${lead.name} ${lead.mobile} ${lead.email ?? ''} ${lead.course ?? ''} ${lead.district ?? ''}`.toLowerCase();
      const searchMatch = text.includes(search.toLowerCase());
      const stageMatch = stage === 'ALL' ? true : lead.status === stage;
      return searchMatch && stageMatch;
    });
  }, [leads, search, stage]);

  const stats = useMemo(() => {
    const unassigned = leads.filter((lead) => !lead.assignedEmployeeId).length;
    const interested = leads.filter((lead) => lead.status === 'INTERESTED').length;
    const converted = leads.filter((lead) => lead.status === 'CONVERTED').length;
    return { total: leads.length, unassigned, interested, converted };
  }, [leads]);

  const toggleLead = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((lead) => lead.id));
    }
  };

  // ----------------------------------------------------
  // SINGLE LEAD CREATE (WITH DUPLICATE VALIDATION)
  // ----------------------------------------------------
  const handleSingleCreate = async (forceDuplicate = false) => {
    if (!addForm.name.trim() || !addForm.mobile.trim()) {
      toast.error('Student Name and Mobile Number are required.');
      return;
    }

    const cleanMobile = normalizePhone(addForm.mobile);
    if (!cleanMobile) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Check if duplicate exists in currently loaded leads
    const existing = leads.find((l) => normalizePhone(l.mobile) === cleanMobile);
    if (existing && !forceDuplicate) {
      setSingleAddDuplicateWarning(
        `Duplicate warning: A student named "${existing.name}" is already registered with mobile ${cleanMobile}. Do you wish to proceed and create anyway?`
      );
      return;
    }

    setSubmitting(true);
    try {
      await createLead({
        name: addForm.name.trim(),
        mobile: cleanMobile,
        email: addForm.email.trim() || undefined,
        fatherName: addForm.fatherName.trim() || undefined,
        course: addForm.course.trim() || undefined,
        district: addForm.district.trim() || undefined,
        location: addForm.location.trim() || undefined,
        school: addForm.school.trim() || undefined,
        gender: addForm.gender || undefined,
        source: addForm.source,
        priority: addForm.priority,
        applicationNumber: addForm.applicationNumber.trim() || undefined,
        notes: addForm.notes.trim() || undefined,
      });

      toast.success('Lead added successfully.');
      setShowAddModal(false);
      setSingleAddDuplicateWarning(null);
      setAddForm({
        name: '',
        mobile: '',
        email: '',
        fatherName: '',
        course: '',
        district: '',
        location: '',
        school: '',
        gender: 'Male',
        source: 'BULK',
        priority: 'MEDIUM',
        applicationNumber: '',
        notes: '',
      });
      await loadData();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Failed to create lead';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // BULK FILE UPLOAD & DUPLICATE DETECTION WORKFLOW
  // ----------------------------------------------------
  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      let parsed = toImportRows(rows);

      // Fallback heuristics if sheet headers are non-standard
      if (!parsed.length) {
        const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
        if (aoa && aoa.length > 0) {
          const headerRow = aoa[0].map((c) => String(c ?? '').trim());
          const dataRows = aoa.slice(1);
          const colCount = Math.max(1, headerRow.length);

          let nameIdx = headerRow.findIndex((h) => /name|student|firstname|fullname/i.test(h));
          let phoneIdx = headerRow.findIndex((h) => /mobile|phone|contact|tel|number/i.test(h));

          if (nameIdx === -1 || phoneIdx === -1) {
            const scoresPhone = new Array(colCount).fill(0);
            const scoresName = new Array(colCount).fill(0);

            for (const r of dataRows) {
              for (let i = 0; i < colCount; i++) {
                const cell = String(r[i] ?? '').trim();
                if (/\d{6,}/.test(cell)) scoresPhone[i]++;
                if (/[A-Za-z]/.test(cell) && cell.split(/\s+/).length <= 5) scoresName[i]++;
              }
            }

            if (phoneIdx === -1) phoneIdx = scoresPhone.findIndex((s) => s === Math.max(...scoresPhone));
            if (nameIdx === -1) nameIdx = scoresName.findIndex((s) => s === Math.max(...scoresName));
          }

          if (nameIdx >= 0 && phoneIdx >= 0) {
            parsed = dataRows
              .map((r) => {
                const name = String(r[nameIdx] ?? '').trim();
                const mobile = normalizePhone(String(r[phoneIdx] ?? ''));
                return { name, mobile, email: undefined, course: undefined, location: undefined, notes: undefined };
              })
              .filter((r) => !!r.name && !!r.mobile);
          }
        }
      }

      if (!parsed.length) {
        toast.error('No valid rows found. Ensure file has Name and Mobile columns.');
        return;
      }

      // Build database mobile index for duplicate cross-checking
      const dbMobileMap = new Map<string, string>();
      leads.forEach((l) => {
        const m = normalizePhone(l.mobile);
        if (m) dbMobileMap.set(m, l.name);
      });

      // Analyze for duplicates
      const seenInFile = new Set<string>();
      const duplicates: DuplicateReportItem[] = [];
      const uniques: LeadImportData[] = [];

      parsed.forEach((row, index) => {
        const cleanMobile = row.mobile;

        // Check if already in Database
        if (dbMobileMap.has(cleanMobile)) {
          duplicates.push({
            rowNumber: index + 1,
            name: row.name,
            mobile: cleanMobile,
            course: row.course,
            reason: 'IN_DATABASE',
            existingLeadName: dbMobileMap.get(cleanMobile),
          });
          return;
        }

        // Check if duplicate inside the file
        if (seenInFile.has(cleanMobile)) {
          duplicates.push({
            rowNumber: index + 1,
            name: row.name,
            mobile: cleanMobile,
            course: row.course,
            reason: 'FILE_DUPLICATE',
          });
          return;
        }

        seenInFile.add(cleanMobile);
        uniques.push(row);
      });

      setImportRows(parsed);
      setDuplicatesReport(duplicates);
      setUniqueImportRows(uniques);

      if (duplicates.length > 0) {
        toast.error(`Found ${duplicates.length} duplicate lead(s). Admin approval required.`);
      } else {
        toast.success(`All ${uniques.length} rows verified unique and valid!`);
      }
    } catch {
      toast.error('Failed to parse file. Upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
    }
  };

  // Run import with unique rows only (approved by admin)
  const runApprovedImport = async () => {
    if (!uniqueImportRows.length) {
      toast.error('No unique leads to import.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await importLeads(uniqueImportRows, true);
      toast.success(`Successfully imported ${result.imported} leads! (Excluded ${duplicatesReport.length} duplicates)`);
      setShowImportModal(false);
      setImportRows([]);
      setUniqueImportRows([]);
      setDuplicatesReport([]);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk import failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const assignSelected = async (employeeId: string) => {
    if (!selectedIds.length) {
      toast.error('Select one or more leads first.');
      return;
    }

    try {
      await assignLeadsToEmployee(selectedIds, employeeId, 'MANUAL');
      toast.success('Leads assigned successfully.');
      setSelectedIds([]);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assignment failed';
      toast.error(message);
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!window.confirm(`Are you sure you want to delete lead "${leadName}"? This action cannot be undone.`)) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteLead(leadId);
      toast.success('Lead deleted successfully.');
      setSelectedLead(null);
      setShowDetailModal(false);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete lead';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      toast.error('Select one or more leads first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} lead(s)? This action cannot be undone.`)) {
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteLead(id)));
      toast.success(`Deleted ${selectedIds.length} lead(s) successfully.`);
      setSelectedIds([]);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete leads';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 relative pb-24">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Lead Import / Add</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Import leads via Excel/CSV, detect and resolve duplicate contacts, and register new student inquiries.
            </p>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-2xs border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={loadData}
            >
              <RefreshCw className={`w-4 h-4 mr-2 text-gray-500 ${loading ? 'animate-spin text-blue-600' : ''}`} /> Refresh
            </Button>
            <Button
              onClick={() => {
                setImportRows([]);
                setDuplicatesReport([]);
                setUniqueImportRows([]);
                setFileName('');
                setShowImportModal(true);
              }}
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-2xs border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              <Upload className="w-4 h-4 mr-2 text-blue-600" /> Bulk Import
            </Button>
            <Button
              className="col-span-2 md:col-span-1 w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => {
                setSingleAddDuplicateWarning(null);
                setShowAddModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Total Leads</div>
            <div className="text-2xl font-black text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-400 mt-1">Inquiries registered</p>
          </Card>
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unassigned</div>
            <div className="text-2xl font-black text-amber-600">{stats.unassigned}</div>
            <p className="text-xs text-gray-400 mt-1">Awaiting counselor assignment</p>
          </Card>
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Interested</div>
            <div className="text-2xl font-black text-blue-600">{stats.interested}</div>
            <p className="text-xs text-gray-400 mt-1">High conversion pipeline</p>
          </Card>
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Converted</div>
            <div className="text-2xl font-black text-emerald-600">{stats.converted}</div>
            <p className="text-xs text-gray-400 mt-1">Admissions confirmed</p>
          </Card>
        </div>

        {/* Search, Stage Filter, and Bulk Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/90">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 w-full md:w-80 border border-gray-200">
              <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search leads by name, phone, course, district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as any)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 outline-none"
            >
              <option value="ALL">All Stages</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {selectedIds.length} selected
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      assignSelected(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs border border-blue-200 rounded-xl px-3 py-2 bg-blue-50 text-blue-800 font-semibold outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Assign to Counselor...
                  </option>
                  {employees
                    .filter((e) => e.role === 'COUNSELLOR')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Leads Table */}
        <Card className="rounded-2xl border-0 shadow-2xs bg-white overflow-hidden" padding="none">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/90 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Mobile &amp; Email</th>
                  <th className="px-6 py-4">Course / Program</th>
                  <th className="px-6 py-4">District / Location</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Assigned Counselor</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t border-gray-100 divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading leads database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No leads match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-blue-50/20 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{lead.name}</td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-gray-800">{lead.mobile}</div>
                        {lead.email && <div className="text-gray-400">{lead.email}</div>}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700">{lead.course || '-'}</td>
                      <td className="px-6 py-4 text-xs text-gray-600">{lead.district || lead.location || '-'}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            lead.status === 'CONVERTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lead.status === 'INTERESTED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : lead.status === 'NEW'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span
                          className={`font-bold ${
                            lead.priority === 'HIGH'
                              ? 'text-rose-600'
                              : lead.priority === 'LOW'
                              ? 'text-slate-400'
                              : 'text-amber-600'
                          }`}
                        >
                          {lead.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {lead.assignedEmployeeId ? (
                          <span className="font-semibold text-gray-800">
                            {employees.find((e) => e.id === lead.assignedEmployeeId)?.name || 'Assigned'}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Lead Details"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* BULK IMPORT MODAL WITH DUPLICATE DETECTION & APPROVAL     */}
      {/* ========================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Bulk Import Leads</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload spreadsheet files with automatic duplicate detection &amp; admin approval
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Upload Zone */}
            <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-blue-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {fileName ? `Selected: ${fileName}` : 'Choose an Excel or CSV file'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Accepted formats: <strong>.xlsx, .xls, .csv</strong> (Max 5,000 rows)
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* DUPLICATE REPORT & APPROVAL PANEL */}
            {duplicatesReport.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Duplicate Leads Identified ({duplicatesReport.length} found)</span>
                </div>
                <p className="text-xs text-amber-800">
                  The system detected existing or repeated telephone numbers in this file. Please review the duplicates
                  below and choose how to proceed:
                </p>

                <div className="max-h-44 overflow-y-auto rounded-xl border border-amber-200 bg-white p-2 text-xs divide-y divide-amber-100">
                  {duplicatesReport.map((dup, i) => (
                    <div key={i} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-gray-900">{dup.name}</span>{' '}
                        <span className="text-gray-500">({dup.mobile})</span>
                        {dup.course && <span className="text-gray-400"> • {dup.course}</span>}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {dup.reason === 'IN_DATABASE'
                          ? `Already exists (${dup.existingLeadName || 'DB'})`
                          : 'Repeated in file'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-amber-100/60 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
                  <span>
                    Unique leads ready to import: <strong>{uniqueImportRows.length}</strong>
                  </span>
                  <span>
                    Excluded duplicates: <strong>{duplicatesReport.length}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Verified Clean Banner */}
            {importRows.length > 0 && duplicatesReport.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  All {uniqueImportRows.length} rows have been verified as unique! No duplicates detected in the database.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>

              {duplicatesReport.length > 0 ? (
                <Button
                  onClick={runApprovedImport}
                  isLoading={submitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm px-5"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Approve &amp; Import {uniqueImportRows.length} Unique Leads
                </Button>
              ) : (
                <Button
                  onClick={runApprovedImport}
                  disabled={uniqueImportRows.length === 0}
                  isLoading={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-5"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import {uniqueImportRows.length} Leads
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXTENDED ADD LEAD MODAL (FULL BULK IMPORT FIELDS)         */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add New Lead</h3>
                <p className="text-xs text-gray-500 mt-0.5">Register a student inquiry with comprehensive academic profile</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate warning confirmation alert */}
            {singleAddDuplicateWarning && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Duplicate Lead Detected</span>
                </div>
                <p>{singleAddDuplicateWarning}</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setSingleAddDuplicateWarning(null)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSingleCreate(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Student Identity */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Student Identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name *</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. K. Priya"
                      value={addForm.name}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="10-digit mobile number"
                      value={addForm.mobile}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, mobile: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Father / Guardian Name</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="Parent name"
                      value={addForm.fatherName}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="student@example.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Interest & School */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Academic Program &amp; Background
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Course / Program Interested</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. B.Tech Computer Science"
                      value={addForm.course}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, course: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Previous School / College</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="School name"
                      value={addForm.school}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, school: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District / City</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. Salem / Namakkal"
                      value={addForm.district}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, district: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      value={addForm.gender}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lead Configuration & Priority */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Source &amp; Priority</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      value={addForm.source}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, source: e.target.value as Lead['source'] }))}
                    >
                      <option value="BULK">Bulk Upload</option>
                      <option value="APPLICATION">Application Portal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Priority</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      value={addForm.priority}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, priority: e.target.value as Lead['priority'] }))}
                    >
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Application Number</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="Optional ID"
                      value={addForm.applicationNumber}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, applicationNumber: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Initial Remarks / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Counselor / Initial Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Notes from initial contact, entrance exam marks, cutoff, etc."
                  value={addForm.notes}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleSingleCreate(false)}
                isLoading={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-5"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Save Lead
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DETAILED LEAD VIEW MODAL                                  */}
      {/* ========================================================= */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h2>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedLead.priority || 'MEDIUM'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedLead.mobile}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">Course Interested</span>
                <p className="text-sm font-bold text-gray-900">{selectedLead.course || 'Not specified'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">District / Location</span>
                <p className="text-sm font-semibold text-gray-900">{selectedLead.district || selectedLead.location || 'Unknown'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">Email</span>
                <p className="text-sm font-semibold text-gray-900">{selectedLead.email || 'Not provided'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">Father Name</span>
                <p className="text-sm font-semibold text-gray-900">{selectedLead.fatherName || 'Not provided'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">School / College</span>
                <p className="text-sm font-semibold text-gray-900">{selectedLead.school || '-'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">Assigned Counselor</span>
                <p className="text-sm font-bold text-blue-600">
                  {selectedLead.assignedEmployeeId
                    ? employees.find((e) => e.id === selectedLead.assignedEmployeeId)?.name || 'Assigned'
                    : 'Unassigned'}
                </p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">Lead Status</span>
                <p className="mt-0.5">
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{selectedLead.status}</Badge>
                </p>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5 uppercase tracking-wider">Next Follow-up</span>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedLead.nextFollowUp?.toDate ? selectedLead.nextFollowUp.toDate().toLocaleString() : 'Not scheduled'}
                </p>
              </div>
            </div>

            {selectedLead.notes && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <span className="font-bold text-gray-700 block uppercase tracking-wider text-[11px]">Counselor Notes</span>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedLead.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              <Button
                onClick={() => handleDeleteLead(selectedLead.id, selectedLead.name)}
                isLoading={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
