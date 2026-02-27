"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  uploadCommunication, deleteCommunication,
  searchCommunications, uploadCommunicationsBatch,
} from "@/lib/api";
import {
  Upload, Trash2, Loader2, FolderOpen, FileText,
  Mail, StickyNote, AlertTriangle, Briefcase, File,
  Search, X, Plus, Minus, MessageSquare,
} from "lucide-react";

const COMM_TYPES = [
  { value: "letter", label: "Letter", icon: Mail },
  { value: "agent_note", label: "Agent Note", icon: StickyNote },
  { value: "e_and_o", label: "E&O Record", icon: AlertTriangle },
  { value: "claims", label: "Claims", icon: Briefcase },
  { value: "memo", label: "Memo", icon: File },
  { value: "other", label: "Other", icon: FileText },
];

interface CommDoc {
  id: string;
  title: string;
  communication_type: string;
  status: string;
  filename: string;
  page_count: number | null;
  created_at: string;
}

interface BatchEntry {
  file: File;
  title: string;
  useFilename: boolean;
}

export default function CommunicationsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<CommDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");
  const [commType, setCommType] = useState("letter");
  const [title, setTitle] = useState("");
  const [useFilenameAsTitle, setUseFilenameAsTitle] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [batchFiles, setBatchFiles] = useState<BatchEntry[]>([]);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchDocs = useCallback(async (type?: string, search?: string) => {
    setLoading(true);
    try {
      const data = await searchCommunications(search || "", type || undefined, 1, 100);
      setDocs(
        (data.communications || []).map((d: any) => ({
          id: d.doc_id,
          title: d.title,
          communication_type: d.communication_type,
          status: d.status,
          filename: d.filename,
          page_count: d.page_count,
          created_at: d.created_at,
        }))
      );
      setTotal(data.total || 0);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(typeFilter, ""); }, [fetchDocs, typeFilter]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchLoading(true);
      fetchDocs(typeFilter, searchQuery).finally(() => setSearchLoading(false));
    }, 300);
  }, [searchQuery, typeFilter, fetchDocs]);

  const handleFileChange = () => {
    if (useFilenameAsTitle && fileRef.current?.files?.[0]) {
      setTitle(fileRef.current.files[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setMessage(null);
    try {
      await uploadCommunication(file, commType, title || undefined);
      setMessage({ type: "success", text: "Communication uploaded and indexed" });
      setTitle("");
      setUseFilenameAsTitle(false);
      if (fileRef.current) fileRef.current.value = "";
      fetchDocs(typeFilter, searchQuery);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleBatchAdd = () => batchFileRef.current?.click();
  const handleBatchFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBatchFiles((prev) => [...prev, ...files.map((f) => ({ file: f, title: f.name.replace(/\.[^/.]+$/, ""), useFilename: true }))].slice(0, 20));
    if (batchFileRef.current) batchFileRef.current.value = "";
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return;
    setUploadLoading(true);
    setMessage(null);
    setBatchResults([]);
    try {
      const result = await uploadCommunicationsBatch(
        batchFiles.map((f) => f.file), commType, batchFiles.map((f) => f.title)
      );
      setBatchResults(result.results || []);
      const success = (result.results || []).filter((r: any) => r.status === "indexed").length;
      setMessage({ type: "success", text: `${success}/${batchFiles.length} documents uploaded` });
      if (success > 0) fetchDocs(typeFilter, searchQuery);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    if (!confirm(`Delete "${docTitle}"?`)) return;
    try {
      await deleteCommunication(id);
      setMessage({ type: "success", text: "Document deleted" });
      fetchDocs(typeFilter, searchQuery);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const getTypeIcon = (type: string) => {
    const found = COMM_TYPES.find((t) => t.value === type);
    return found ? <found.icon className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
  };
  const getTypeLabel = (type: string) => COMM_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
        <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" /> Communications
      </h1>
      <p className="text-sm text-gray-500 mt-1">Upload and manage agency letters, notes, and records</p>

      {/* Upload Mode Toggle */}
      <div className="mt-4 flex gap-2">
        <button onClick={() => setUploadMode("single")}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${uploadMode === "single" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Single Upload
        </button>
        <button onClick={() => setUploadMode("batch")}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${uploadMode === "batch" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Batch Upload
        </button>
      </div>

      {/* Single Upload */}
      {uploadMode === "single" && (
        <form onSubmit={handleUpload} className="mt-4 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-600" /> Upload Communication
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={commType} onChange={(e) => setCommType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                {COMM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" required onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Title (optional)</label>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={useFilenameAsTitle}
                  onChange={(e) => {
                    setUseFilenameAsTitle(e.target.checked);
                    if (e.target.checked && fileRef.current?.files?.[0]) setTitle(fileRef.current.files[0].name.replace(/\.[^/.]+$/, ""));
                  }}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                Use filename as title
              </label>
            </div>
            <input type="text" value={title}
              onChange={(e) => { setTitle(e.target.value); setUseFilenameAsTitle(false); }}
              placeholder="e.g. Renewal Letter - Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div className="mt-4">
            <button type="submit" disabled={uploadLoading}
              className="w-full sm:w-auto bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {uploadLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4" /> Upload</>}
            </button>
          </div>
        </form>
      )}

      {/* Batch Upload */}
      {uploadMode === "batch" && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-600" /> Batch Upload (up to 20)
          </h2>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type (applied to all)</label>
            <select value={commType} onChange={(e) => setCommType(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white">
              {COMM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input ref={batchFileRef} type="file" accept=".pdf,.docx,.txt" multiple className="hidden" onChange={handleBatchFilesSelected} />
          <button onClick={handleBatchAdd} disabled={batchFiles.length >= 20}
            className="mb-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add Files
          </button>
          {batchFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {batchFiles.map((entry, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600 truncate flex-shrink-0 max-w-[180px]">{entry.file.name}</span>
                  <input type="text" value={entry.title}
                    onChange={(e) => { const u = [...batchFiles]; u[i].title = e.target.value; u[i].useFilename = false; setBatchFiles(u); }}
                    placeholder="Title (optional)"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none w-full sm:w-auto" />
                  <button onClick={() => setBatchFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 transition flex-shrink-0"><Minus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          {batchFiles.length > 0 && (
            <button onClick={handleBatchUpload} disabled={uploadLoading}
              className="w-full sm:w-auto bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {uploadLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload All ({batchFiles.length})</>}
            </button>
          )}
          {batchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {batchResults.map((r: any, i: number) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-lg ${r.status === "indexed" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  <span className="font-medium">{r.filename || `File ${i + 1}`}:</span> {r.status === "indexed" ? `${r.chunk_count || 0} chunks` : r.error || "Failed"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Document List */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <h2 className="font-medium text-gray-900">Documents ({total})</h2>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="">All Types</option>
            {COMM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or filename..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          )}
          {searchLoading && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin" />}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" /></div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              {searchQuery || typeFilter ? "No documents match your search" : "No communications uploaded yet"}
            </p>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-gray-400 flex-shrink-0">{getTypeIcon(doc.communication_type)}</div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{doc.title || doc.filename}</div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-2">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{getTypeLabel(doc.communication_type)}</span>
                      <span className="hidden sm:inline">{doc.filename}</span>
                      {doc.page_count && <span>{doc.page_count} pages</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/staff/query?type=communications`)}
                    className="text-gray-400 hover:text-brand-600 transition p-1"
                    title="Query communications"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(doc.id, doc.title || doc.filename)}
                    className="text-gray-400 hover:text-red-500 transition p-1" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}