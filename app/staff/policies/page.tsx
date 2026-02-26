"use client";

import { useState, useRef } from "react";
import {
  uploadPolicy,
  uploadPoliciesBatch,
  deletePolicy,
  checkPolicyAvailable,
} from "@/lib/api";
import {
  Upload,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Files,
  Plus,
  X,
} from "lucide-react";

interface PolicyInfo {
  number: string;
  available: boolean;
  chunkCount: number | null;
  indexedAt: string | null;
}

interface BatchEntry {
  file: File;
  policyNumber: string;
}

interface BatchResult {
  policy_number: string;
  filename: string;
  status: string;
  page_count: number | null;
  chunk_count: number | null;
  error: string | null;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Single upload
  const [policyNumber, setPolicyNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Batch upload
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);
  const batchFileRef = useRef<HTMLInputElement>(null);

  // Check known policies on first load
  const [checked, setChecked] = useState(false);
  if (!checked) {
    setChecked(true);
    const knownPolicies = [
      "POL-2024-HO-001",
      "POL-2024-AU-002",
      "POL-2024-CGL-003",
    ];
    Promise.all(
      knownPolicies.map(async (num) => {
        try {
          const data = await checkPolicyAvailable(num);
          return {
            number: num,
            available: data.available,
            chunkCount: data.chunk_count,
            indexedAt: data.indexed_at,
          };
        } catch {
          return { number: num, available: false, chunkCount: null, indexedAt: null };
        }
      })
    ).then(setPolicies);
  }

  // ── Single Upload ─────────────────────────────────────────────────────

  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !policyNumber) return;

    setUploadLoading(true);
    setMessage(null);

    try {
      const result = await uploadPolicy(file, policyNumber);
      setMessage({
        type: "success",
        text: `Policy ${policyNumber} uploaded and indexed (${result.status})`,
      });
      setPolicyNumber("");
      if (fileRef.current) fileRef.current.value = "";

      const updated = await checkPolicyAvailable(policyNumber);
      setPolicies((prev) => {
        const exists = prev.find((p) => p.number === policyNumber);
        const info: PolicyInfo = {
          number: policyNumber,
          available: updated.available,
          chunkCount: updated.chunk_count,
          indexedAt: updated.indexed_at,
        };
        return exists
          ? prev.map((p) => (p.number === policyNumber ? info : p))
          : [...prev, info];
      });
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

    const newEntries: BatchEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      newEntries.push({
        file: files[i],
        policyNumber: "", // User will fill in
      });
    }

    setBatchEntries((prev) => [...prev, ...newEntries]);
    if (batchFileRef.current) batchFileRef.current.value = "";
  };

  const updateBatchPolicyNumber = (index: number, value: string) => {
    setBatchEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, policyNumber: value } : entry
      )
    );
  };

  const removeBatchEntry = (index: number) => {
    setBatchEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (batchEntries.length === 0) return;

    // Validate all have policy numbers
    const missing = batchEntries.filter((e) => !e.policyNumber.trim());
    if (missing.length > 0) {
      setMessage({
        type: "error",
        text: `${missing.length} file(s) missing a policy number`,
      });
      return;
    }

    setUploadLoading(true);
    setMessage(null);
    setBatchResults(null);

    try {
      const result = await uploadPoliciesBatch(
        batchEntries.map((e) => e.file),
        batchEntries.map((e) => e.policyNumber.trim())
      );
      setBatchResults(result.results);
      setMessage({
        type: result.failed > 0 ? "error" : "success",
        text: `Batch complete: ${result.succeeded} succeeded, ${result.failed} failed`,
      });

      // Refresh policies list for newly indexed ones
      for (const r of result.results) {
        if (r.status === "indexed") {
          try {
            const updated = await checkPolicyAvailable(r.policy_number);
            setPolicies((prev) => {
              const exists = prev.find((p) => p.number === r.policy_number);
              const info: PolicyInfo = {
                number: r.policy_number,
                available: updated.available,
                chunkCount: updated.chunk_count,
                indexedAt: updated.indexed_at,
              };
              return exists
                ? prev.map((p) =>
                    p.number === r.policy_number ? info : p
                  )
                : [...prev, info];
            });
          } catch {}
        }
      }

      // Clear batch entries on full success
      if (result.failed === 0) {
        setBatchEntries([]);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (num: string) => {
    if (!confirm(`Delete policy ${num} and all associated data?`)) return;
    setLoading(true);
    try {
      await deletePolicy(num);
      setPolicies((prev) => prev.filter((p) => p.number !== num));
      setMessage({ type: "success", text: `Policy ${num} deleted` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900">
        Policy Management
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Upload, monitor, and manage insurance policy documents
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

      {/* Single Upload Form */}
      {uploadMode === "single" && (
        <form
          onSubmit={handleSingleUpload}
          className="mt-4 bg-white rounded-xl border border-gray-200 p-5"
        >
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Upload Single
            Policy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy Number
              </label>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="e.g. POL-2024-HO-004"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDF File
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
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

      {/* Batch Upload Form */}
      {uploadMode === "batch" && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Files className="w-5 h-5 text-blue-600" /> Batch Policy Upload
          </h2>

          {/* Add files button */}
          <div className="flex items-center gap-3 mb-4">
            <input
              ref={batchFileRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={addBatchFiles}
              className="hidden"
            />
            <button
              onClick={() => batchFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
            >
              <Plus className="w-4 h-4" /> Add PDF Files
            </button>
            <span className="text-xs text-gray-400">
              {batchEntries.length} file(s) selected (max 10)
            </span>
          </div>

          {/* File list with policy number inputs */}
          {batchEntries.length > 0 && (
            <div className="space-y-2 mb-4">
              {batchEntries.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2"
                >
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate w-48">
                    {entry.file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {(entry.file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                  <input
                    type="text"
                    value={entry.policyNumber}
                    onChange={(e) =>
                      updateBatchPolicyNumber(i, e.target.value)
                    }
                    placeholder="Policy # (required)"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeBatchEntry(i)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Batch upload button */}
          {batchEntries.length > 0 && (
            <button
              onClick={handleBatchUpload}
              disabled={uploadLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing{" "}
                  {batchEntries.length} files...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload All (
                  {batchEntries.length})
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
                  <span className="font-medium">{r.policy_number}</span>
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

      {/* Policy List */}
      <h2 className="mt-8 font-medium text-gray-900">
        Indexed Policies ({policies.filter((p) => p.available).length})
      </h2>
      <div className="mt-3 space-y-2">
        {policies.map((p) => (
          <div
            key={p.number}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-sm text-gray-900">
                  {p.number}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {p.available ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500 inline mr-1" />
                      {p.chunkCount} chunks indexed
                      {p.indexedAt &&
                        ` · ${new Date(p.indexedAt).toLocaleDateString()}`}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-gray-300 inline mr-1" />
                      Not indexed
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(p.number)}
              disabled={loading}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}