"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  adminListStaff, adminCreateStaff, adminUpdateStaff, adminToggleStaffStatus, resetStaffPassword,
} from "@/lib/api";
import { Search, Plus, Loader2 } from "lucide-react";

interface StaffItem {
  id: string; email: string; name: string | null; role: string;
  is_active: boolean; is_self: boolean; last_login_at: string | null; created_at: string | null;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "staff" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Password link state (for create flow)
  const [passwordLink, setPasswordLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset password modal state
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListStaff({ page, page_size: pageSize, search: search || undefined });
      setStaff(data.staff); setTotal(data.total);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setPasswordLink(null); setCopied(false);
    try {
      const result = await adminCreateStaff(createForm);
      load();
      if (result.password_reset_url) {
        setPasswordLink(result.password_reset_url);
      } else {
        setShowCreate(false);
        setCreateForm({ name: "", email: "", role: "staff" });
      }
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleCloseCreateModal = () => {
    setShowCreate(false);
    setPasswordLink(null);
    setCopied(false);
    setCreateForm({ name: "", email: "", role: "staff" });
    setError("");
  };

  const handleCopyLink = () => {
    if (passwordLink) {
      navigator.clipboard.writeText(passwordLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true); setError("");
    try {
      await adminUpdateStaff(id, editForm);
      setEditingId(null); load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s: StaffItem) => {
    try { await adminToggleStaffStatus(s.id, !s.is_active); load(); }
    catch (err: any) { setError(err.message); }
  };

  const handleResetPassword = async (staffId: string, email: string) => {
    setError("");
    try {
      const result = await resetStaffPassword(staffId);
      setResetLink(result.password_reset_url);
      setResetEmail(email);
      setShowResetModal(true);
      setResetCopied(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyResetLink = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} staff member{total !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 self-start">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name or email..."
                 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr></thead>
            <tbody>
            {loading ? (
                <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-500" /></td></tr>
            ) : staff.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-sm text-gray-400">No staff found.</td></tr>
            ) : staff.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                        <div className="space-y-1">
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="Name" />
                          <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="Email" />
                        </div>
                    ) : (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {s.name || "—"}
                            {s.is_self && <span className="ml-1.5 text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">You</span>}
                          </div>
                          <div className="text-xs text-gray-500">{s.email}</div>
                        </>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {editingId === s.id ? (
                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="px-2 py-1 border rounded text-sm">
                          <option value="staff">Staff</option><option value="admin">Admin</option>
                        </select>
                    ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{s.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.is_self ? (
                        <span className="text-xs text-gray-400">Cannot modify own account</span>
                    ) : editingId === s.id ? (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-gray-500 border rounded hover:bg-gray-50">Cancel</button>
                          <button onClick={() => handleSaveEdit(s.id)} disabled={saving} className="px-2 py-1 text-xs bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">Save</button>
                        </div>
                    ) : (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleToggle(s)} className={`px-2 py-1 text-xs rounded border ${s.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}>
                            {s.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => { setEditingId(s.id); setEditForm({ name: s.name || "", email: s.email, role: s.role }); setError(""); }} className="px-2 py-1 text-xs text-gray-500 border rounded hover:bg-gray-50">Edit</button>
                          <button onClick={() => handleResetPassword(s.id, s.email)} className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50">Reset PW</button>
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

        {/* Create Staff Modal — switches between form and password link */}
        {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    {passwordLink ? "Staff User Created" : "Add Staff Member"}
                  </h3>
                  <button onClick={handleCloseCreateModal} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>

                {passwordLink ? (
                    <div className="space-y-4">
                      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        User created successfully. Share this link with them to set their password:
                      </div>
                      <div className="relative">
                        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-700 font-mono break-all overflow-x-auto max-h-24">{passwordLink}</pre>
                        <button
                            onClick={handleCopyLink}
                            className="absolute top-2 right-2 px-2 py-1 text-[11px] text-brand-600 border border-brand-200 rounded hover:bg-brand-50"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">This link expires in 7 days. The user can set their password and then log in immediately.</p>
                      <button
                          onClick={handleCloseCreateModal}
                          className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
                      >
                        Done
                      </button>
                    </div>
                ) : (
                    <form onSubmit={handleCreate} className="space-y-4">
                      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                        <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                          <option value="staff">Staff</option><option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={handleCloseCreateModal} className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Adding..." : "Add Staff"}</button>
                      </div>
                    </form>
                )}
              </div>
            </div>
        )}

        {/* Reset Password Modal */}
        {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Password Reset Link</h3>
                  <button onClick={() => { setShowResetModal(false); setResetLink(null); setResetEmail(null); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>
                <div className="space-y-4">
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    Password reset link generated for <strong>{resetEmail}</strong>:
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-700 font-mono break-all overflow-x-auto max-h-24">{resetLink}</pre>
                    <button
                        onClick={handleCopyResetLink}
                        className="absolute top-2 right-2 px-2 py-1 text-[11px] text-brand-600 border border-brand-200 rounded hover:bg-brand-50"
                    >
                      {resetCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500">This link expires in 7 days.</p>
                  <button
                      onClick={() => { setShowResetModal(false); setResetLink(null); setResetEmail(null); }}
                      className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}