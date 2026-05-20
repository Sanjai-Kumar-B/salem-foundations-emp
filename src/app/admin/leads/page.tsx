'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Badge, Button, Card } from '@/components/ui';
import {
  CheckCircle2,
  Download,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
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
  return value.replace(/\D/g, '').slice(-10);
}

function toImportRows(sheetRows: Record<string, unknown>[]): LeadImportData[] {
  // Normalize header keys to be flexible with variations like "Name", "student_name", "Student Name"
  return sheetRows
    .map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        const key = String(k).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        normalized[key] = v;
      }

      const name = String(
        normalized['name'] ?? normalized['studentname'] ?? normalized['firstname'] ?? ''
      ).trim();

      const mobile = normalizePhone(
        String(
          normalized['mobile'] ?? normalized['mobilenumber'] ?? normalized['phone'] ?? normalized['contact'] ?? normalized['phonenumber'] ?? normalized['phonenumber'] ?? ''
        )
      );

      const email = String(normalized['email'] ?? normalized['emailaddress'] ?? '').trim() || undefined;

      // Map institution/school to course when present
      const course = String(normalized['course'] ?? normalized['program'] ?? normalized['schoolname'] ?? '').trim() || undefined;

      // Build a sensible location string from common address fields
      const addrParts = [
        String(normalized['houseaddress'] ?? '').trim(),
        String(normalized['streetname'] ?? '').trim(),
        String(normalized['areavillage'] ?? '').trim(),
        String(normalized['districtname'] ?? normalized['district'] ?? '').trim(),
        String(normalized['pincode'] ?? '').trim(),
      ].filter(Boolean);
      const location = addrParts.length ? addrParts.join(', ') : (String(normalized['location'] ?? '') || undefined);

      // Aggregate miscellaneous fields into notes
      const notesParts = [
        String(normalized['medinstrdesc'] ?? normalized['medinstr'] ?? '').trim(),
        String(normalized['fathername'] ?? '').trim(),
        String(normalized['gender'] ?? '').trim(),
        String(normalized['udisecode'] ?? normalized['udise'] ?? '').trim(),
      ].filter(Boolean);
      const notes = notesParts.length ? notesParts.join(' | ') : (String(normalized['notes'] ?? normalized['remarks'] ?? '') || undefined);

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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    mobile: '',
    email: '',
    source: 'BULK' as Lead['source'],
  });
  const [importRows, setImportRows] = useState<LeadImportData[]>([]);
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
      const text = `${lead.name} ${lead.mobile} ${lead.email ?? ''}`.toLowerCase();
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((lead) => lead.id));
    }
  };

  const handleSingleCreate = async () => {
    if (!addForm.name || !addForm.mobile) {
      toast.error('Name and mobile are required.');
      return;
    }

    setSubmitting(true);
    try {
      await createLead({
        name: addForm.name,
        mobile: normalizePhone(addForm.mobile),
        email: addForm.email || undefined,
        source: addForm.source,
      });
      toast.success('Lead added successfully.');
      setShowAddModal(false);
      setAddForm({ name: '', mobile: '', email: '', source: 'BULK' });
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create lead';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const normalized = toImportRows(rows);

      // If normalization yields no rows (e.g. header names differ or sheet is headerless),
      // attempt a fallback: read the sheet as an array-of-arrays and heuristically
      // detect which columns look like name and mobile.
      let finalRows = normalized;

      if (!finalRows.length) {
        const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
        if (aoa && aoa.length > 0) {
          const headerRow = aoa[0].map((c) => String(c ?? '').trim());
          const dataRows = aoa.slice(1);
          const colCount = Math.max(1, headerRow.length);

          // Try detect by header labels first
          let nameIdx = headerRow.findIndex((h) => /name|student|firstname|fullname/i.test(h));
          let phoneIdx = headerRow.findIndex((h) => /mobile|phone|contact|tel|number/i.test(h));

          // If headers don't help, score columns by content
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

            if (phoneIdx === -1) {
              const max = Math.max(...scoresPhone);
              phoneIdx = scoresPhone.findIndex((s) => s === max);
            }
            if (nameIdx === -1) {
              const max = Math.max(...scoresName);
              nameIdx = scoresName.findIndex((s) => s === max);
            }
          }

          if (nameIdx >= 0 && phoneIdx >= 0) {
            const guessed = dataRows
              .map((r) => {
                const name = String(r[nameIdx] ?? '').trim();
                const mobile = normalizePhone(String(r[phoneIdx] ?? ''));
                return { name, mobile, email: undefined, course: undefined, location: undefined, notes: undefined };
              })
              .filter((r) => !!r.name && !!r.mobile);

            if (guessed.length) finalRows = guessed;
          }
        }
      }

      if (!finalRows.length) {
        toast.error('No valid rows found. Ensure file has name and mobile columns.');
        return;
      }

      setImportRows(finalRows);
      toast.success(`${finalRows.length} rows ready for import.`);
    } catch {
      toast.error('Failed to parse file. Upload a valid Excel or CSV file.');
    }
  };

  const runBulkImport = async () => {
    if (!importRows.length) {
      toast.error('Upload a file first.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await importLeads(importRows, true);
      toast.success(`Imported ${result.imported} leads. Skipped duplicates: ${result.duplicates}`);
      setShowImportModal(false);
      setImportRows([]);
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Leads Workspace</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Manage intake, assignments, and live lead pipeline.</p>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-sm border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={loadData}
            >
              <Download className="w-4 h-4 mt-0.5 min-w-[16px] mr-2 text-gray-500" /> Refresh
            </Button>
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-sm border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              <Upload className="w-4 h-4 mt-0.5 min-w-[16px] mr-2 text-gray-500" /> Bulk Import
            </Button>
            <Button
              className="col-span-2 md:col-span-1 w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mt-0.5 min-w-[16px] mr-2" /> Add Lead
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Total Leads</div>
            <div className="text-2xl font-black text-gray-900">{stats.total}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Unassigned</div>
            <div className="text-2xl font-black text-gray-900">{stats.unassigned}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Interested</div>
            <div className="text-2xl font-black text-gray-900">{stats.interested}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Converted</div>
            <div className="text-2xl font-black text-gray-900">{stats.converted}</div>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 w-full max-w-md border border-gray-200">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, mobile, email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="h-9 px-3 text-xs rounded-lg border-gray-200 text-gray-600 bg-white hover:bg-gray-50 whitespace-nowrap">
              <Filter className="w-3 h-3 mr-1.5" /> Filter
            </Button>
            <select
              className="h-9 border border-gray-200 rounded-lg px-2 text-xs"
              value={stage}
              onChange={(event) => setStage(event.target.value as 'ALL' | Lead['status'])}
            >
              <option value="ALL">All Status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
        </div>

        <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden" padding="none">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-4">Lead</th>
                  <th className="px-4 py-4">Source</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Assigned Counsellor</th>
                  <th className="px-4 py-4">Next Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Loading leads...</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No leads found.</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const assigned = employees.find((employee) => employee.id === lead.assignedEmployeeId);
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}>
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(lead.id)}
                            onChange={() => toggleLead(lead.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-900 text-base">{lead.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{lead.mobile}</div>
                          {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{lead.source}</td>
                        <td className="px-4 py-4">
                          <Badge className="bg-blue-50 text-blue-700 border-0">{lead.status}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          {assigned ? (
                            <div className="text-sm font-medium text-gray-900">{assigned.name}</div>
                          ) : (
                            <span className="text-xs text-gray-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600">
                          {lead.nextFollowUp ? lead.nextFollowUp.toDate().toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-full flex items-center shadow-2xl z-40 gap-3">
          <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-md">{selectedIds.length} Selected</div>
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                assignSelected(event.target.value);
                event.target.value = '';
              }
            }}
          >
            <option value="" disabled>Assign to...</option>
            {employees
              .filter((employee) => employee.role === 'COUNSELLOR' && employee.isActive)
              .map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
          </select>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3 h-3 inline mr-1" /> Delete
          </button>
          <button onClick={() => setSelectedIds([])} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/30" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Add Lead</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Name" value={addForm.name} onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))} />
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Mobile" value={addForm.mobile} onChange={(event) => setAddForm((prev) => ({ ...prev, mobile: event.target.value }))} />
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Email" value={addForm.email} onChange={(event) => setAddForm((prev) => ({ ...prev, email: event.target.value }))} />
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={addForm.source} onChange={(event) => setAddForm((prev) => ({ ...prev, source: event.target.value as Lead['source'] }))}>
                <option value="BULK">Bulk</option>
                <option value="APPLICATION">Application</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleSingleCreate} isLoading={submitting}><CheckCircle2 className="w-4 h-4 mr-2" /> Save Lead</Button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/30" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Bulk Import Leads</h3>
            <p className="text-sm text-gray-600">Upload Excel/CSV with columns like Name, Mobile, Email, Course, District/Location, Notes.</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {importRows.length > 0 && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                {importRows.length} valid rows are ready for import.
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button onClick={runBulkImport} isLoading={submitting}><Upload className="w-4 h-4 mr-2" /> Import</Button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/30" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedLead.mobile}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</label>
                <p className="text-sm text-gray-900 mt-1">{selectedLead.email || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Source</label>
                <p className="text-sm text-gray-900 mt-1">{selectedLead.source}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</label>
                <p className="text-sm text-gray-900 mt-1"><Badge className="bg-blue-50 text-blue-700 border-0">{selectedLead.status}</Badge></p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Priority</label>
                <p className="text-sm text-gray-900 mt-1">{selectedLead.priority || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Course</label>
                <p className="text-sm text-gray-900 mt-1">{selectedLead.course || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Location</label>
                <p className="text-sm text-gray-900 mt-1">{selectedLead.location || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Assigned To</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedLead.assignedEmployeeId
                    ? employees.find((e) => e.id === selectedLead.assignedEmployeeId)?.name || 'Unknown'
                    : 'Unassigned'}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Next Follow-up</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedLead.nextFollowUp ? selectedLead.nextFollowUp.toDate().toLocaleString() : '-'}
                </p>
              </div>
            </div>

            {selectedLead.notes && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes</label>
                <p className="text-sm text-gray-900 mt-2 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selectedLead.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => handleDeleteLead(selectedLead.id, selectedLead.name)}
                isLoading={submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
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
