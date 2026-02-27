"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { queryPolicy, queryCommunications, searchPolicies } from "@/lib/api";
import { Send, FileText, FolderOpen, Loader2, BookOpen, Search, ChevronDown } from "lucide-react";

interface Citation {
  page: number | null;
  section: string;
  text: string;
  similarity_score: number;
}

interface QueryResult {
  answer: string;
  citations: Citation[];
  confidence: number;
  latency_ms: number;
  query_id: string;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  text: string;
  result?: QueryResult;
}

interface PolicyOption {
  number: string;
  label: string;
}

export default function StaffQueryPage() {
  const searchParams = useSearchParams();
  const [queryType, setQueryType] = useState<"policy" | "communications">("policy");
  const [policyNumber, setPolicyNumber] = useState("");
  const [commType, setCommType] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic policy list with search
  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([]);
  const [policySearch, setPolicySearch] = useState("");
  const [policyDropdownOpen, setPolicyDropdownOpen] = useState(false);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Read URL params on mount
  useEffect(() => {
    const urlPolicy = searchParams.get("policy");
    const urlType = searchParams.get("type");
    if (urlPolicy) {
      setPolicyNumber(urlPolicy);
      setQueryType("policy");
    }
    if (urlType === "communications") {
      setQueryType("communications");
    }
  }, [searchParams]);

  // Load policies
  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const data = await searchPolicies("", 1, 100);
        const opts: PolicyOption[] = (data.policies || [])
          .filter((p: any) => p.status === "indexed")
          .map((p: any) => ({
            number: p.policy_number,
            label: `${p.policy_number}${p.filename ? ` (${p.filename})` : ""}`,
          }));
        setPolicyOptions(opts);
        // Set default if none selected
        if (!policyNumber && opts.length > 0) {
          setPolicyNumber(opts[0].number);
        }
      } catch {
        // Fallback
        const fallback = [
          { number: "POL-2024-HO-001", label: "POL-2024-HO-001 (Homeowners)" },
          { number: "POL-2024-AU-002", label: "POL-2024-AU-002 (Auto)" },
          { number: "POL-2024-CGL-003", label: "POL-2024-CGL-003 (CGL)" },
        ];
        setPolicyOptions(fallback);
        if (!policyNumber) setPolicyNumber(fallback[0].number);
      }
    };
    loadPolicies();
  }, []);

  // Debounced policy search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!policySearch.trim()) return;

    searchTimeout.current = setTimeout(async () => {
      setPoliciesLoading(true);
      try {
        const data = await searchPolicies(policySearch, 1, 20);
        setPolicyOptions(
          (data.policies || [])
            .filter((p: any) => p.status === "indexed")
            .map((p: any) => ({
              number: p.policy_number,
              label: `${p.policy_number}${p.filename ? ` (${p.filename})` : ""}`,
            }))
        );
      } catch {
        // keep existing
      } finally {
        setPoliciesLoading(false);
      }
    }, 300);
  }, [policySearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPolicyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), type: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    const q = question;
    setQuestion("");
    setLoading(true);

    try {
      let result: QueryResult;
      if (queryType === "policy") {
        result = await queryPolicy(policyNumber, q);
      } else {
        result = await queryCommunications(q, commType || undefined);
      }
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "assistant", text: result.answer, result },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "assistant", text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policySearch.trim()
    ? policyOptions.filter((p) => p.label.toLowerCase().includes(policySearch.toLowerCase()))
    : policyOptions;

  return (
    <div className="h-[100dvh] sm:h-screen flex flex-col overflow-hidden">
      {/* Header — scrollable on mobile if needed, but contained */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 overflow-x-auto">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Ask Questions</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Query policies or agency communications with AI-powered search
        </p>

        {/* Query type & filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-4">
          <div className="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setQueryType("policy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                queryType === "policy"
                  ? "bg-white shadow text-brand-700 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" /> Policy
            </button>
            <button
              onClick={() => setQueryType("communications")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                queryType === "communications"
                  ? "bg-white shadow text-brand-700 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Comms
            </button>
          </div>

          {queryType === "policy" && (
            <div className="relative w-full sm:w-72" ref={dropdownRef}>
              <div
                onClick={() => setPolicyDropdownOpen(!policyDropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:border-gray-400 bg-white"
              >
                <span className="truncate">
                  {policyNumber || "Select a policy..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition ${policyDropdownOpen ? "rotate-180" : ""}`} />
              </div>

              {policyDropdownOpen && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={policySearch}
                        onChange={(e) => setPolicySearch(e.target.value)}
                        placeholder="Search policies..."
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      {policiesLoading && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-500 animate-spin" />
                      )}
                    </div>
                  </div>
                  <div className="overflow-auto max-h-48">
                    {filteredPolicies.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">No policies found</div>
                    ) : (
                      filteredPolicies.map((p) => (
                        <button
                          key={p.number}
                          onClick={() => {
                            setPolicyNumber(p.number);
                            setPolicyDropdownOpen(false);
                            setPolicySearch("");
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition truncate ${
                            p.number === policyNumber ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {queryType === "communications" && (
            <select
              value={commType}
              onChange={(e) => setCommType(e.target.value)}
              className="w-full sm:w-48 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
            >
              <option value="">All Types</option>
              <option value="letter">Letters</option>
              <option value="agent_note">Agent Notes</option>
              <option value="e_and_o">E&O Records</option>
              <option value="claims">Claims</option>
              <option value="memo">Memos</option>
            </select>
          )}
        </div>
      </div>

      {/* Messages — fills remaining space, scrolls vertically only */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
            <Search className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-30" />
            <p className="text-base sm:text-lg font-medium text-center">Ask anything about your policies</p>
            <p className="text-sm mt-1 text-center">
              {queryType === "policy"
                ? `Querying: ${policyNumber}`
                : "Searching across agency communications"}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-fade-in ${msg.type === "user" ? "flex justify-end" : ""}`}
          >
            {msg.type === "user" ? (
              <div className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] sm:max-w-lg text-sm break-words">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[95%] sm:max-w-2xl">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
                    {msg.text}
                  </div>

                  {msg.result && msg.result.citations.length > 0 && (
                    <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                        <BookOpen className="w-3.5 h-3.5" /> Sources
                      </div>
                      <div className="space-y-1.5">
                        {msg.result.citations.slice(0, 3).map((c, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                            <span className="font-medium text-gray-700">
                              Page {c.page}{c.section ? `, ${c.section}` : ""}
                            </span>
                            <span className="text-gray-400 ml-2">
                              ({(c.similarity_score * 100).toFixed(0)}% match)
                            </span>
                            <p className="mt-0.5 text-gray-500 line-clamp-2 break-words">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.result && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400">
                      <span>Confidence: {(msg.result.confidence * 100).toFixed(0)}%</span>
                      <span className="hidden sm:inline">·</span>
                      <span>{msg.result.latency_ms}ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="animate-fade-in flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching documents...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — fixed at bottom */}
      <div className="bg-white border-t px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              queryType === "policy"
                ? "Ask about this policy..."
                : "Search agency communications..."
            }
            disabled={loading}
            className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-brand-600 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition flex-shrink-0"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}