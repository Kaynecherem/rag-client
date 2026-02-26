"use client";

import { useState, useEffect } from "react";
import { getPolicyholderQueryHistory } from "@/lib/api";
import { History, Loader2, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

interface QueryItem {
  id: string;
  question: string;
  answer_preview: string;
  confidence: number | null;
  latency_ms: number | null;
  citation_count: number;
  queried_at: string;
}

export default function PolicyholderHistoryPage() {
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const PAGE_SIZE = 25;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getPolicyholderQueryHistory(page, PAGE_SIZE);
        setQueries(data.queries || []);
        setTotal(data.total || 0);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
        <History className="w-5 h-5" /> My Past Questions
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        View your previous questions and the answers you received
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : queries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No questions yet</p>
            <p className="text-sm mt-1">Your past questions will appear here after you ask them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queries.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      {expandedId !== q.id && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {q.answer_preview}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                      <span>
                        {new Date(q.queried_at).toLocaleDateString()}
                      </span>
                      {expandedId === q.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {expandedId === q.id && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {q.answer_preview}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      {q.confidence != null && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {(q.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                      <span>{q.citation_count} citations</span>
                      <span>{q.latency_ms}ms</span>
                    </div>
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
              Page {page} of {totalPages}
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