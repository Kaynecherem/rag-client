"use client";

import { useState } from "react";
import { queryPolicy, queryCommunications } from "@/lib/api";
import { Send, FileText, FolderOpen, Loader2, BookOpen } from "lucide-react";

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

export default function StaffQueryPage() {
  const [queryType, setQueryType] = useState<"policy" | "communications">("policy");
  const [policyNumber, setPolicyNumber] = useState("POL-2024-HO-001");
  const [commType, setCommType] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text: question,
    };
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

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: result.answer,
        result,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "assistant", text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Ask Questions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Query policies or agency communications with AI-powered search
        </p>

        {/* Query type & filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setQueryType("policy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
                queryType === "policy"
                  ? "bg-white shadow text-brand-700 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" /> Policy
            </button>
            <button
              onClick={() => setQueryType("communications")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
                queryType === "communications"
                  ? "bg-white shadow text-brand-700 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Communications
            </button>
          </div>

          {queryType === "policy" && (
            <select
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="POL-2024-HO-001">POL-2024-HO-001 (Homeowners - Smith)</option>
              <option value="POL-2024-AU-002">POL-2024-AU-002 (Auto - Rodriguez)</option>
              <option value="POL-2024-CGL-003">POL-2024-CGL-003 (CGL - Springfield Hardware)</option>
            </select>
          )}

          {queryType === "communications" && (
            <select
              value={commType}
              onChange={(e) => setCommType(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none"
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
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">Ask anything about your policies</p>
            <p className="text-sm mt-1">
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
              <div className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-lg text-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-2xl">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>

                  {msg.result && msg.result.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                        <BookOpen className="w-3.5 h-3.5" /> Sources
                      </div>
                      <div className="space-y-1.5">
                        {msg.result.citations.slice(0, 3).map((c, i) => (
                          <div
                            key={i}
                            className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600"
                          >
                            <span className="font-medium text-gray-700">
                              Page {c.page}, {c.section}
                            </span>
                            <span className="text-gray-400 ml-2">
                              ({(c.similarity_score * 100).toFixed(0)}% match)
                            </span>
                            <p className="mt-0.5 text-gray-500 line-clamp-2">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.result && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>Confidence: {(msg.result.confidence * 100).toFixed(0)}%</span>
                      <span>·</span>
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
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
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
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-brand-600 text-white px-5 py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Search(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
