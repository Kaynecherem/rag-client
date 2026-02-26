"use client";

import { useState, useRef, useEffect } from "react";
import {
  uploadCommunication,
  uploadCommunicationsBatch,
  listCommunications,
  deleteCommunication,
} from "@/lib/api";
import {
  Upload,
  Trash2,
  Loader2,
  FolderOpen,
  FileText,
  Mail,
  StickyNote,
  AlertTriangle,
  Briefcase,
  File,
  Files,
  Plus,
  X,
  CheckCircle,
  XCircle,
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
  chunk_count: number | null;
  created_at: string;
}

interface BatchFile {
  file: File;
  title: string;
}

interface BatchResult {
  doc_id: string;
  filename: string;
  status: string;
  communication_type: string;
  page_count: number | null;
  chunk_count: number | null;
  error: string | null;
}

export default function CommunicationsPage() {
  const [docs, setDocs] = useState<CommDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Upload mode
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");

  // Single upload form
  const [commType, setCommType] = useState("letter");
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Batch upload
  const [batchCommType, setBatchCommType] = useState("letter");
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);
  const batchFileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async (typeFilter?: string) => {
    setLoading(true);
    try {
      const data = await listCommunications(1, 50, typeFilter || undefined);
      setDocs(data.communications || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs(filter);
  }, [filter]);

  // ── Single Upload ─────────────────────────────────────────────────────

  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setMessage(null);

    try {
      await uploadCommunication(file, commType, title || undefined);
      setMessage({
        type: "success",
        text: "Communication uploaded and indexed",
      });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      fetchDocs(filter);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Batch Upload ──────────────────────────────────────────────────────

  const addBatchFiles = () => {
    const files = batchFileRef.current?.files;
    if (!files || files.length === 0) return;

    const newEntries: BatchFile[] = [];
    for (let i = 0; i < files.length; i++) {
      newEntries.push({ file: files[i], title: "" });
    }
    setBatchFiles((prev) => [...prev, ...newEntries]);
    if (batchFileRef.current) batchFileRef.current.value = "";
  };

  const updateBatchTitle = (index: number, value: string) => {
    setBatchFiles((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, title: value } : entry))
    );
  };

  const removeBatchFile = (index: number) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return;

    setUploadLoading(true);
    setMessage(null);
    setBatchResults(null);

    try {
      const titles = batchFiles.map(
        (e) => e.title.trim() || e.file.name
      );
      const result = await uploadCommunicationsBatch(
        batchFiles.map((e) => e.file),
        batchCommType,
        titles
      );
      setBatchResults(result.results);
      setMessage({
        type: result.failed > 0 ? "error" : "success",
        text: `Batch complete: ${result.succeeded} succeeded, ${result.failed} failed`,
      });

      if (result.failed === 0) setBatchFiles([]);
      fetchDocs(filter);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, docTitle: string) => {
    if (!confirm(`Delete "${docTitle}"?`)) return;
    try {
      await deleteCommunication(id);
      setMessage({ type: "success", text: "Document deleted" });
      fetchDocs(filter);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const getTypeIcon = (type: string) => {
    const found = COMM_TYPES.find((t) => t.value === type);
    return found ? found.icon : FileText;
  };

  const getTypeLabel = (type: string) => {
    const found = COMM_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      letter: "bg-blue-50 text-blue-700",
      agent_note: "bg-amber-50 text-amber-700",
      e_and_o: "bg-red-50 text-red-700",
      claims: "bg-purple-50 text-purple-700",
      memo: "bg-gray-100 text-gray-600",
      other: "bg-gray-100 text-gray-600",
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900">Communications</h1>
      <p className="text-sm text-gray-500 mt-1">
        Upload and manage agency communications, letters, and records
      </p>

      {/* Upload Mode Toggle */}
      <div className="mt-6 flex bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setUploadMode("single")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
            uploadMode === "single"
              ? "bg-white shadow text-gray-900 font-medium"
              : "text-gray-500"
          }`}
        >
          <Upload className="w-4 h-4" /> Single File
        </button>
        <button
          onClick={() => setUploadMode("batch")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
            uploadMode === "batch"
              ? "bg-white shadow text-gray-900 font-medium"
              : "text-gray-500"
          }`}
        >
          <Files className="w-4 h-4" /> Multi-File
        </button>
      </div>

      {/* Single Upload */}
      {uploadMode === "single" && (
        <form
          onSubmit={handleSingleUpload}
          className="mt-4 bg-white rounded-xl border border-gray-200 p-5"
        >
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Upload Single Document
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {COMM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                required
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Batch Upload */}
      {uploadMode === "batch" && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Files className="w-5 h-5 text-blue-600" /> Batch Upload
          </h2>

          {/* Type selector for all files */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700">
              Type for all:
            </label>
            <select
              value={batchCommType}
              onChange={(e) => setBatchCommType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {COMM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Add files */}
          <div className="flex items-center gap-3 mb-4">
            <input
              ref={batchFileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={addBatchFiles}
              className="hidden"
            />
            <button
              onClick={() => batchFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
            >
              <Plus className="w-4 h-4" /> Add Files
            </button>
            <span className="text-xs text-gray-400">
              {batchFiles.length} file(s) selected (max 20)
            </span>
          </div>

          {/* File list */}
          {batchFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {batchFiles.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2"
                >
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate w-40">
                    {entry.file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {(entry.file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => updateBatchTitle(i, e.target.value)}
                    placeholder="Title (optional, defaults to filename)"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeBatchFile(i)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload all */}
          {batchFiles.length > 0 && (
            <button
              onClick={handleBatchUpload}
              disabled={uploadLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing{" "}
                  {batchFiles.length} files...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload All (
                  {batchFiles.length})
                </>
              )}
            </button>
          )}

          {/* Batch results */}
          {batchResults && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Results</h3>
              {batchResults.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${
                    r.status === "indexed"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {r.status === "indexed" ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{r.filename}</span>
                  {r.status === "indexed" ? (
                    <span className="ml-auto text-xs">
                      {r.page_count} pages · {r.chunk_count} chunks
                    </span>
                  ) : (
                    <span className="ml-auto text-xs truncate max-w-xs">
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filter & Document List */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">
          Documents{" "}
          {total > 0 && (
            <span className="text-gray-400 font-normal">({total})</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Types</option>
            {COMM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        )}

        {!loading && docs.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No communications found</p>
          </div>
        )}

        {!loading &&
          docs.map((doc) => {
            const Icon = getTypeIcon(doc.communication_type);
            return (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {doc.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadgeColor(
                          doc.communication_type
                        )}`}
                      >
                        {getTypeLabel(doc.communication_type)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {doc.chunk_count
                          ? `${doc.chunk_count} chunks`
                          : doc.status}
                      </span>
                      <span className="text-xs text-gray-300">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  className="text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}