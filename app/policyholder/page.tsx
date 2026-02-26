"use client";

import { useState, useRef, useEffect } from "react";
import { queryPolicy } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Send, Shield, Loader2, BookOpen } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What are my coverage limits?",
  "What is my deductible?",
  "What exclusions apply to my policy?",
  "How do I file a claim?",
  "What is my policy effective date?",
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

export default function PolicyholderPage() {
  const { policyNumber } = useAuth();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          text: result.answer,
          result,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          text: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Chat area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-brand-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome! Ask me about your policy.
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                I can help you understand your coverage, deductibles, exclusions, and more.
                All answers are sourced directly from your policy document.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map((sq) => (
                  <button
                    key={sq}
                    onClick={() => handleSubmit(sq)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`animate-fade-in ${msg.type === "user" ? "flex justify-end" : ""}`}
              >
                {msg.type === "user" ? (
                  <div className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-md text-sm">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-xl">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </div>

                      {msg.result && msg.result.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                            <BookOpen className="w-3.5 h-3.5" /> Sources from your policy
                          </div>
                          <div className="space-y-1.5">
                            {msg.result.citations.slice(0, 3).map((c, i) => (
                              <div
                                key={i}
                                className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600"
                              >
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching your policy...
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
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleFormSubmit} className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your policy..."
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
          <p className="text-xs text-gray-400 mt-2 text-center">
            Answers are generated from your policy document. Always verify with your agent for important decisions.
          </p>
        </div>
      </div>
    </div>
  );
}