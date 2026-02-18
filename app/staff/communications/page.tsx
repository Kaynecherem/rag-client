"use client";

import { useState, useRef, useEffect } from "react";
import { uploadCommunication, listCommunications, deleteCommunication } from "@/lib/api";
import {
  Upload, Trash2, Loader2, FolderOpen, FileText,
  Mail, StickyNote, AlertTriangle, Briefcase, File,
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

export default function CommunicationsPage() {
  const [docs, setDocs] = useState<CommDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Upload form
  const [commType, setCommType] = useState("letter");
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setMessage(null);

    try {
      await uploadCommunication(file, commType, title || undefined);
      setMessage({ type: "success", text: `Communication uploaded and indexed` });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      fetchDocs(filter);
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
      fetchDocs(filter);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

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
      memo: "bg-gray-50 text-gray-700",
      other: "bg-gray-50 text-gray-600",
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900">Communications</h1>
      <p className="text-sm text-gray-500 mt-1">
        Manage agency correspondence, agent notes, E&O records, and claims documents
      </p>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-brand-600" /> Upload Communication
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={commType}
              onChange={(e) => setCommType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {COMM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renewal Letter - Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              required
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {uploadLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload</>
              )}
            </button>
          </div>
        </div>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          message.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Filter */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">
          Documents {total > 0 && <span className="text-gray-400 font-normal">({total})</span>}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">All Types</option>
            {COMM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document list */}
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

        {!loading && docs.map((doc) => {
          const Icon = getTypeIcon(doc.communication_type);
          return (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{doc.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadgeColor(doc.communication_type)}`}>
                      {getTypeLabel(doc.communication_type)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {doc.chunk_count ? `${doc.chunk_count} chunks` : doc.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id, doc.title)}
                className="text-gray-400 hover:text-red-500 transition shrink-0 ml-4"
                title="Delete document"
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
