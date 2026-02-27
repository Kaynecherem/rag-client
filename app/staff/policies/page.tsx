"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  uploadPolicy, deletePolicy, checkPolicyAvailable,
  searchPolicies, uploadPoliciesBatch,
} from "@/lib/api";
import {
  Upload, Trash2, CheckCircle, XCircle, Loader2, FileText,
  Search, X, ChevronDown, ChevronUp, Plus, Minus,
} from "lucide-react";

interface PolicyInfo {
  number: string;
  available: boolean;
  chunkCount: number | null;
  filename?: string;
  createdAt?: string;
}

interface BatchFileEntry {
  file: File;
  policyNumber: string;
}

interface BatchResult {
  policy_number: string;
  status: string;
  error?: string;
  page_count?: number;
  chunk_count?: number;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [policyNumber, setPolicyNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PolicyInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Upload mode
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");

  // Batch
  const [batchFiles, setBatchFiles] = useState<BatchFileEntry[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);

  // Load policies
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchPolicies("", 1, 100);
      const items: PolicyInfo[] = (data.policies || []).map((p: any) => ({
        number: p.policy_number,
        available: p.status === "indexed",
        chunkCount: p.chunk_count,
        filename: p.filename,
        createdAt: p.created_at,
      }));
      setPolicies(items);
      setSearchResults(items);
    } catch {
      // Fallback to known policies
      const knownPolicies = ["POL-2024-HO-001", "POL-2024-AU-002", "POL-2024-CGL-003"];
      const items = await Promise.all(
        knownPolicies.map(async (num) => {
          try {
            const data = await checkPolicyAvailable(num);
            return { number: num, available: data.available, chunkCount: data.chunk_count };
          } catch {
            return { number: num, available: false, chunkCount: null };
          }
        })
      );
      setPolicies(items);
      setSearchResults(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!searchQuery.trim()) {
      setSearchResults(policies);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await searchPolicies(searchQuery, 1, 50);
        setSearchResults(
          (data.policies || []).map((p: any) => ({
            number: p.policy_number,
            available: p.status === "indexed",
            chunkCount: p.chunk_count,
            filename: p.filename,
            createdAt: p.created_at,
          }))
        );
      } catch {
        // Filter locally as fallback
        setSearchResults(
          policies.filter((p) =>
            p.number.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchQuery, policies]);

  // Single upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !policyNumber) return;

    setUploadLoading(true);
    setMessage(null);

    try {
      const result = await uploadPolicy(file, policyNumber);
      setMessage({ type: "success", text: `Policy ${policyNumber} uploaded (${result.status})` });
      setPolicyNumber("");
      if (fileRef.current) fileRef.current.value = "";
      fetchPolicies();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // Batch upload
  const handleBatchAdd = () => {
    batchFileRef.current?.click();
  };

  const handleBatchFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newEntries: BatchFileEntry[] = files.map((f) => ({
      file: f,
      policyNumber: "",
    }));
    setBatchFiles((prev) => [...prev, ...newEntries].slice(0, 10));
    if (batchFileRef.current) batchFileRef.current.value = "";
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return;
    if (batchFiles.some((f) => !f.policyNumber.trim())) {
      setMessage({ type: "error", text: "Please enter a policy number for each file" });
      return;
    }

    setUploadLoading(true);
    setMessage(null);
    setBatchResults([]);

    try {
      const files = batchFiles.map((f) => f.file);
      const numbers = batchFiles.map((f) => f.policyNumber);
      const result = await uploadPoliciesBatch(files, numbers);
      setBatchResults(result.results || []);
      const success = (result.results || []).filter((r: any) => r.status === "indexed").length;
      setMessage({ type: "success", text: `${success}/${batchFiles.length} policies uploaded` });
      if (success > 0) fetchPolicies();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (num: string) => {
    if (!confirm(`Delete policy ${num} and all associated data?`)) return;
    try {
      await deletePolicy(num);
      setPolicies((prev) => prev.filter((p) => p.number !== num));
      setSearchResults((prev) => prev.filter((p) => p.number !== num));
      setMessage({ type: "success", text: `Policy ${num} deleted` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Policy Management</h1>
      <p className="text-sm text-gray-500 mt-1">Upload, monitor, and manage insurance policy documents</p>

      {/* Upload Mode Toggle */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setUploadMode("single")}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            uploadMode === "single"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Single Upload
        </button>
        <button
          onClick={() => setUploadMode("batch")}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            uploadMode === "batch"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Batch Upload
        </button>
      </div>

      {/* Single Upload */}
      {uploadMode === "single" && (
        <form onSubmit={handleUpload} className="mt-4 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-600" /> Upload New Policy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="e.g. POL-2024-HO-004"
                required
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
                  <><Upload className="w-4 h-4" /> Upload & Index</>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Batch Upload */}
      {uploadMode === "batch" && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-600" /> Batch Upload (up to 10)
          </h2>
          <input
            ref={batchFileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleBatchFilesSelected}
          />
          <button
            onClick={handleBatchAdd}
            disabled={batchFiles.length >= 10}
            className="mb-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add PDF Files
          </button>

          {batchFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {batchFiles.map((entry, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600 truncate flex-shrink-0 max-w-[200px]">
                    {entry.file.name}
                  </span>
                  <input
                    type="text"
                    value={entry.policyNumber}
                    onChange={(e) => {
                      const updated = [...batchFiles];
                      updated[i].policyNumber = e.target.value;
                      setBatchFiles(updated);
                    }}
                    placeholder="Policy number"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none w-full sm:w-auto"
                  />
                  <button
                    onClick={() => setBatchFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {batchFiles.length > 0 && (
            <button
              onClick={handleBatchUpload}
              disabled={uploadLoading}
              className="w-full sm:w-auto bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {uploadLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload All ({batchFiles.length})</>
              )}
            </button>
          )}

          {/* Batch results */}
          {batchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {batchResults.map((r, i) => (
                <div
                  key={i}
                  className={`text-sm px-3 py-2 rounded-lg ${
                    r.status === "indexed"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <span className="font-medium">{r.policy_number}:</span>{" "}
                  {r.status === "indexed"
                    ? `${r.chunk_count} chunks indexed`
                    : r.error || "Failed"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message */}
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

      {/* Search Box */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Indexed Policies</h2>
          <span className="text-xs text-gray-400">{searchResults.length} policies</span>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by policy number..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searchLoading && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin" />
          )}
        </div>

        {/* Policy list */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              {searchQuery ? "No policies match your search" : "No policies found"}
            </p>
          ) : (
            searchResults.map((p) => (
              <div
                key={p.number}
                className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{p.number}</div>
                    <div className="text-xs text-gray-500">
                      {p.available ? `${p.chunkCount} chunks indexed` : "Not indexed"}
                      {p.filename && <span className="hidden sm:inline"> · {p.filename}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {p.available ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                  <button
                    onClick={() => handleDelete(p.number)}
                    className="text-gray-400 hover:text-red-500 transition"
                    title="Delete policy"
                  >
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