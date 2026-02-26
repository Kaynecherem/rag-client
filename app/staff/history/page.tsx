"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStaffQueryHistory,
  getStaffQueryStats,
  getQueryDetail,
} from "@/lib/api";
import {
  History,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Users,
  Clock,
  BarChart3,
  X,
} from "lucide-react";

interface QueryItem {
  id: string;
  user_type: string;
  user_identifier: string;
  policy_number: string | null;
  document_type: string | null;
  question: string;
  answer_preview: string;
  confidence: number | null;
  latency_ms: number | null;
  citation_count: number;
  queried_at: string;
}

interface QueryDetail {
  id: string;
  question: string;
  answer: string;
  citations: Array<{
    page: number | null;
    section: string;
    text: string;
    similarity_score: number;
  }>;
  confidence: number;
  latency_ms: number;
  user_type: string;
  user_identifier: string;
  policy_number: string | null;
  document_type: string | null;
  queried_at: string;
}

interface Stats {
  total_queries: number;
  by_user_type: { staff: number; policyholder: number };
  by_document_type: { policy: number; communication: number };
  avg_confidence: number;
  avg_latency_ms: number;
}

export default function StaffHistoryPage() {
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [policyFilter, setPolicyFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const PAGE_SIZE = 25;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaffQueryHistory({
        page,
        page_size: PAGE_SIZE,
        user_type: userTypeFilter || undefined,
        document_type: docTypeFilter || undefined,
        policy_number: policyFilter || undefined,
        search: searchText || undefined,
      });
      setQueries(data.queries || []);
      setTotal(data.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, userTypeFilter, docTypeFilter, policyFilter, searchText]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      try {
        const data = await getStaffQueryStats();
        setStats(data);
      } catch {
        // silently fail
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const openDetail = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await getQueryDetail(id);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchText(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setUserTypeFilter("");
    setDocTypeFilter("");
    setPolicyFilter("");
    setSearchText("");
    setSearchInput("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = userTypeFilter || docTypeFilter || policyFilter || searchText;

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
        <History className="w-5 h-5" /> Query History
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Browse all past queries across your agency
      </p>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <BarChart3 className="w-3.5 h-3.5" /> Total Queries
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_queries}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <Users className="w-3.5 h-3.5" /> By User
            </div>
            <div className="mt-1 text-sm">
              <span className="font-semibold text-blue-700">{stats.by_user_type.staff}</span>
              <span className="text-gray-400 mx-1">staff</span>
              <span className="font-semibold text-green-700">{stats.by_user_type.policyholder}</span>
              <span className="text-gray-400 ml-1">holders</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" /> Avg Confidence
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {(stats.avg_confidence * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" /> Avg Latency
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats.avg_latency_ms}ms
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-5 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </form>

          <select
            value={userTypeFilter}
            onChange={(e) => { setUserTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Users</option>
            <option value="staff">Staff</option>
            <option value="policyholder">Policyholder</option>
          </select>

          <select
            value={docTypeFilter}
            onChange={(e) => { setDocTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Types</option>
            <option value="policy">Policy</option>
            <option value="communication">Communication</option>
          </select>

          <input
            type="text"
            value={policyFilter}
            onChange={(e) => { setPolicyFilter(e.target.value); setPage(1); }}
            placeholder="Policy #"
            className="w-36 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : queries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No queries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queries.map((q) => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200">
                <button
                  onClick={() => openDetail(q.id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {q.question}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {q.answer_preview}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        q.user_type === "staff"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-green-50 text-green-700"
                      }`}>
                        {q.user_type}
                      </span>
                      <span>{q.user_identifier}</span>
                      {q.policy_number && <span>Policy: {q.policy_number}</span>}
                      {q.document_type && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {q.document_type}
                        </span>
                      )}
                      <span>{q.citation_count} citations</span>
                      {q.confidence != null && (
                        <span>{(q.confidence * 100).toFixed(0)}% conf</span>
                      )}
                      <span>{q.latency_ms}ms</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(q.queried_at).toLocaleDateString()} {new Date(q.queried_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {selectedId === q.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {selectedId === q.id && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {detailLoading ? (
                      <div className="flex items-center text-gray-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading detail...
                      </div>
                    ) : detail ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Answer</h4>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.answer}</p>
                        </div>
                        {detail.citations && detail.citations.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Citations ({detail.citations.length})
                            </h4>
                            <div className="space-y-2">
                              {detail.citations.map((c, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="font-medium">
                                      Page {c.page || "?"} · {c.section}
                                    </span>
                                    <span className="text-gray-400">
                                      {(c.similarity_score * 100).toFixed(1)}% match
                                    </span>
                                  </div>
                                  <p className="text-gray-700 line-clamp-3">{c.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Could not load detail</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}