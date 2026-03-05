"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { queryPolicy, queryCommunications, searchPolicies, getStaffConversation } from "@/lib/api";
import { Send, FileText, FolderOpen, Loader2, BookOpen, Search, ChevronDown, Shield } from "lucide-react";

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
  queryId?: string; // links to DB query ID for scroll targeting
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
  const [conversationLoading, setConversationLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<string | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Dynamic policy list with search
  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([]);
  const [policySearch, setPolicySearch] = useState("");
  const [policyDropdownOpen, setPolicyDropdownOpen] = useState(false);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Track which policy's conversation is loaded to avoid re-fetching
  const loadedPolicyRef = useRef<string>("");

  // Read URL params on mount
  useEffect(() => {
    const urlPolicy = searchParams.get("policy");
    const urlType = searchParams.get("type");
    const urlQueryId = searchParams.get("scroll_to");
    if (urlPolicy) {
      setPolicyNumber(urlPolicy);
      setQueryType("policy");
    }
    if (urlType === "communications") {
      setQueryType("communications");
    }
    if (urlQueryId) {
      scrollTargetRef.current = urlQueryId;
    }
  }, [searchParams]);

  // Load policies list
  useEffect(() => {
    const loadPolicies = async () => {
      const urlPolicy = searchParams.get("policy");
      try {
        const data = await searchPolicies("", 1, 100);
        const opts: PolicyOption[] = (data.policies || [])
          .filter((p: any) => p.status === "indexed")
          .map((p: any) => ({
            number: p.policy_number,
            label: `${p.policy_number}${p.filename ? ` (${p.filename})` : ""}`,
          }));
        setPolicyOptions(opts);
        if (!urlPolicy && !policyNumber && opts.length > 0) {
          setPolicyNumber(opts[0].number);
        }
      } catch {
        const fallback = [
          { number: "POL-2024-HO-001", label: "POL-2024-HO-001 (Homeowners)" },
          { number: "POL-2024-AU-002", label: "POL-2024-AU-002 (Auto)" },
          { number: "POL-2024-CGL-003", label: "POL-2024-CGL-003 (CGL)" },
        ];
        setPolicyOptions(fallback);
        if (!urlPolicy && !policyNumber) setPolicyNumber(fallback[0].number);
      }
    };
    loadPolicies();
  }, [searchParams]);

  // Load conversation when policy changes
  const loadConversation = useCallback(async (polNum: string) => {
    if (!polNum || queryType !== "policy") return;
    if (loadedPolicyRef.current === polNum) return; // already loaded

    setConversationLoading(true);
    try {
      const data = await getStaffConversation(polNum);
      const msgs: Message[] = [];
      for (const q of data.queries || []) {
        msgs.push({
          id: `${q.id}-q`,
          type: "user",
          text: q.question,
          queryId: q.id,
        });
        msgs.push({
          id: `${q.id}-a`,
          type: "assistant",
          text: q.answer || "",
          queryId: q.id,
          result: {
            answer: q.answer || "",
            citations: q.citations || [],
            confidence: q.confidence || 0,
            latency_ms: q.latency_ms || 0,
            query_id: q.id,
          },
        });
      }
      setMessages(msgs);
      loadedPolicyRef.current = polNum;
    } catch {
      // If conversation load fails, start fresh
      setMessages([]);
      loadedPolicyRef.current = polNum;
    } finally {
      setConversationLoading(false);
    }
  }, [queryType]);

  useEffect(() => {
    if (policyNumber && queryType === "policy") {
      loadConversation(policyNumber);
    }
  }, [policyNumber, queryType, loadConversation]);

  // When switching to communications, clear policy conversation
  useEffect(() => {
    if (queryType === "communications") {
      setMessages([]);
      loadedPolicyRef.current = "";
    }
  }, [queryType]);

  // Scroll to target query (from history page) or to bottom
  useEffect(() => {
    if (conversationLoading) return;

    const target = scrollTargetRef.current;
    if (target) {
      // Try to scroll to the specific query
      const el = messageRefs.current[target];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Brief highlight effect
          el.classList.add("ring-2", "ring-brand-400", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-brand-400", "ring-offset-2"), 2000);
        }, 100);
        scrollTargetRef.current = null;
      }
    } else if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, conversationLoading]);

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

  // Handle policy switch — clear and reload
  const handlePolicySwitch = (newPolicy: string) => {
    if (newPolicy === policyNumber) return;
    loadedPolicyRef.current = ""; // force reload
    scrollTargetRef.current = null;
    setPolicyNumber(newPolicy);
    setPolicyDropdownOpen(false);
    setPolicySearch("");
  };

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
    ? policyOptions.filter((p) =>
        p.label.toLowerCase().includes(policySearch.toLowerCase())
      )
    : policyOptions;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex-shrink-0">
        <h1 className="text-base sm:text-lg font-semibold text-gray-900">Ask Questions</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Query policies or agency communications with AI-powered search
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 relative z-10">
          {/* Query Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 self-start">
            <button
              onClick={() => setQueryType("policy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                queryType === "policy"
                  ? "bg-white text-brand-700 shadow font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Policy
            </button>
            <button
              onClick={() => setQueryType("communications")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                queryType === "communications"
                  ? "bg-white text-brand-700 shadow font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Comms
            </button>
          </div>

          {/* Policy Selector */}
          {queryType === "policy" && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setPolicyDropdownOpen(!policyDropdownOpen)}
                className="w-full sm:w-64 flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition"
              >
                <span className="truncate">{policyNumber || "Select policy..."}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition ${policyDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {policyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={policySearch}
                        onChange={(e) => setPolicySearch(e.target.value)}
                        placeholder="Search policies..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
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
                          onClick={() => handlePolicySwitch(p.number)}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          {conversationLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading conversation...
            </div>
          )}

          {!conversationLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 min-h-[300px]">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-brand-600" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-gray-900 text-center">
                {queryType === "policy" ? "No questions yet for this policy" : "Ask anything about your communications"}
              </p>
              <p className="text-sm text-gray-500 mt-1 text-center">
                {queryType === "policy"
                  ? `Start a conversation about ${policyNumber}`
                  : "Searching across agency communications"}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              ref={(el) => { if (msg.queryId) messageRefs.current[msg.queryId] = el; }}
              className={`animate-fade-in transition-all duration-300 rounded-xl ${msg.type === "user" ? "flex justify-end" : ""}`}
            >
              {msg.type === "user" ? (
                <div className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] sm:max-w-md text-sm break-words">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-[95%] sm:max-w-xl">
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
            <div className="animate-fade-in">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm inline-block">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching documents...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
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
    </div>
  );
}