"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  adminListPolicyholders, adminCreatePolicyholder, adminUpdatePolicyholder, adminTogglePolicyholderStatus,
} from "@/lib/api";
import { Search, Plus, Loader2 } from "lucide-react";

interface PHItem {
  id: string; policy_number: string; last_name: string | null;
  company_name: string | null; is_active: boolean; created_at: string | null;
}

export default function AdminPolicyholdersPage() {
  const [phs, setPhs] = useState<PHItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ policy_number: "", last_name: "", company_name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ policy_number: "", last_name: "", company_name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListPolicyholders({ page, page_size: pageSize, search: search || undefined });
      setPhs(data.policyholders); setTotal(data.total);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await adminCreatePolicyholder({
        policy_number: createForm.policy_number,
        last_name: createForm.last_name || undefined,
        company_name: createForm.company_name || undefined,
      });
      setShowCreate(false); setCreateForm({ policy_number: "", last_name: "", company_name: "" }); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true); setError("");
    try {
      await adminUpdatePolicyholder(id, editForm);
      setEditingId(null); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (ph: PHItem) => {
    try { await adminTogglePolicyholderStatus(ph.id, !ph.is_active); load(); }
    catch (err: any) { setError(err.message); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Policyholder Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} policyholder{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 self-start">
          <Plus className="w-4 h-4" /> Add Policyholder
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by policy #, name, or company..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Policy #</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Name / Company</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-500" /></td></tr>
            ) : phs.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-sm text-gray-400">No policyholders found.</td></tr>
            ) : phs.map((ph) => (
              <tr key={ph.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editingId === ph.id ? (
                    <input value={editForm.policy_number} onChange={(e) => setEditForm({ ...editForm, policy_number: e.target.value })} className="w-full px-2 py-1 border rounded text-sm font-mono" />
                  ) : (
                    <span className="text-sm font-mono text-gray-900">{ph.policy_number}</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {editingId === ph.id ? (
                    <div className="space-y-1">
                      <input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="Last name" />
                      <input value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="Company" />
                    </div>
                  ) : (
                    <div>
                      {ph.last_name && <div className="text-sm text-gray-900">{ph.last_name}</div>}
                      {ph.company_name && <div className="text-xs text-gray-500">{ph.company_name}</div>}
                      {!ph.last_name && !ph.company_name && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ph.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {ph.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === ph.id ? (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-gray-500 border rounded hover:bg-gray-50">Cancel</button>
                      <button onClick={() => handleSaveEdit(ph.id)} disabled={saving} className="px-2 py-1 text-xs bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">Save</button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditingId(ph.id); setEditForm({ policy_number: ph.policy_number, last_name: ph.last_name || "", company_name: ph.company_name || "" }); setError(""); }} className="px-2 py-1 text-xs text-gray-500 border rounded hover:bg-gray-50">Edit</button>
                      <button onClick={() => handleToggle(ph)} className={`px-2 py-1 text-xs rounded border ${ph.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}>
                        {ph.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Add Policyholder</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Policy Number</label>
                <input type="text" value={createForm.policy_number} onChange={(e) => setCreateForm({ ...createForm, policy_number: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none" placeholder="POL-2024-001" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                <input type="text" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                <input type="text" value={createForm.company_name} onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <p className="text-xs text-gray-400">At least one of last name or company name is required.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Adding..." : "Add Policyholder"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
