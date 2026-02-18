"use client";

import { useState, useRef } from "react";
import { uploadPolicy, deletePolicy, checkPolicyAvailable } from "@/lib/api";
import { Upload, Trash2, CheckCircle, XCircle, Loader2, FileText } from "lucide-react";

interface PolicyInfo {
  number: string;
  available: boolean;
  chunkCount: number | null;
  indexedAt: string | null;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [policyNumber, setPolicyNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Check known policies on first load
  const [checked, setChecked] = useState(false);
  if (!checked) {
    setChecked(true);
    const knownPolicies = ["POL-2024-HO-001", "POL-2024-AU-002", "POL-2024-CGL-003"];
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !policyNumber) return;

    setUploadLoading(true);
    setMessage(null);

    try {
      const result = await uploadPolicy(file, policyNumber);
      setMessage({ type: "success", text: `Policy ${policyNumber} uploaded and indexed (${result.status})` });
      setPolicyNumber("");
      if (fileRef.current) fileRef.current.value = "";

      // Refresh list
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
      <h1 className="text-xl font-semibold text-gray-900">Policy Management</h1>
      <p className="text-sm text-gray-500 mt-1">Upload, monitor, and manage insurance policy documents</p>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-brand-600" /> Upload New Policy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload & Index
                </>
              )}
            </button>
          </div>
        </div>
      </form>

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

      {/* Policy list */}
      <div className="mt-6">
        <h2 className="font-medium text-gray-900 mb-3">Indexed Policies</h2>
        <div className="space-y-2">
          {policies.map((p) => (
            <div
              key={p.number}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm text-gray-900">{p.number}</div>
                  <div className="text-xs text-gray-500">
                    {p.available ? `${p.chunkCount} chunks indexed` : "Not indexed"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
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
          ))}
          {policies.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No policies found</p>
          )}
        </div>
      </div>
    </div>
  );
}
