"use client";

import { useState, useRef, useEffect } from "react";
import { queryPolicy, downloadPolicy, getPolicyText } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Send, Shield, Loader2, BookOpen, Download,
  FileText, X, ChevronDown,
} from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What are my coverage limits?",
  "What is my deductible?",
  "What exclusions apply?",
  "How do I file a claim?",
  "What's my effective date?",
];

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
}

interface Message {
  id: string;
  type: "user" | "assistant";
  text: string;
  result?: QueryResult;
}

interface PolicySection {
  page: number | null;
  section: string | null;
  text: string;
}

export default function PolicyholderPage() {
  const { policyNumber } = useAuth();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Policy viewer
  const [showPolicyViewer, setShowPolicyViewer] = useState(false);
  const [policyText, setPolicyText] = useState<PolicySection[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (overrideQuestion?: string) => {
    const q = overrideQuestion || question.trim();
    if (!q || loading || !policyNumber) return;

    const userMsg: Message = { id: Date.now().toString(), type: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideQuestion) setQuestion("");
    setLoading(true);

    try {
      const result = await queryPolicy(policyNumber, q);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "assistant", text: result.answer, result },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "assistant", text: `Sorry, I encountered an error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!policyNumber || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadPolicy(policyNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${policyNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to download policy: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleViewPolicy = async () => {
    if (showPolicyViewer) {
      setShowPolicyViewer(false);
      return;
    }
    if (!policyNumber) return;
    setPolicyLoading(true);
    try {
      const data = await getPolicyText(policyNumber);
      setPolicyText(data.sections || []);
      setShowPolicyViewer(true);
    } catch (err: any) {
      alert("Failed to load policy: " + err.message);
    } finally {
      setPolicyLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Policy Actions Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-end gap-2">
        <button
          onClick={handleViewPolicy}
          disabled={policyLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          {policyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          {showPolicyViewer ? "Close" : "Read Policy"}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Download PDF
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${showPolicyViewer ? "hidden sm:flex" : ""}`}>
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-brand-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Welcome! Ask me about your policy.
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                    I can help you understand your coverage, deductibles, exclusions, and more.
                  </p>
                  <div className="mt-5 sm:mt-6 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                    {SUGGESTED_QUESTIONS.map((sq) => (
                      <button
                        key={sq}
                        onClick={() => handleSubmit(sq)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs sm:text-sm text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`animate-fade-in ${msg.type === "user" ? "flex justify-end" : ""}`}>
                    {msg.type === "user" ? (
                      <div className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] sm:max-w-md text-sm">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="max-w-[95%] sm:max-w-xl">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
                          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </div>
                          {msg.result && msg.result.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                                <BookOpen className="w-3.5 h-3.5" /> Sources
                              </div>
                              <div className="space-y-1.5">
                                {msg.result.citations.slice(0, 3).map((c, i) => (
                                  <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                                    <span className="font-medium text-gray-700">
                                      Page {c.page}{c.section ? `, ${c.section}` : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {msg.result && (
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                              <span>{(msg.result.confidence * 100).toFixed(0)}% confidence</span>
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
                        <Loader2 className="w-4 h-4 animate-spin" /> Searching your policy...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="bg-white border-t">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about your policy..."
                  disabled={loading}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="bg-brand-600 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-2 text-center hidden sm:block">
                Answers are generated from your policy document. Always verify with your agent for important decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Viewer Sidebar */}
        {showPolicyViewer && (
          <div className="w-full sm:w-[400px] lg:w-[480px] border-l bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-medium text-sm text-gray-900">Policy Document</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => setShowPolicyViewer(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {policyText.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No content available</p>
              ) : (
                <div className="space-y-4">
                  {policyText.map((section, i) => (
                    <div key={i} className="text-sm">
                      {section.section && (
                        <h4 className="font-semibold text-gray-800 mb-1 text-xs uppercase tracking-wide">
                          {section.section}
                        </h4>
                      )}
                      {section.page && (
                        <span className="text-xs text-gray-400 mb-1 block">Page {section.page}</span>
                      )}
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs">
                        {section.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}