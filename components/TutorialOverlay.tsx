"use client";

import { useState } from "react";
import { X, ChevronRight, MessageSquare, FileText, Download, History } from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "center" | "top" | "bottom";
}

const STEPS: TutorialStep[] = [
  {
    title: "Ask Questions",
    description: "Type any question about your policy in the chat box at the bottom. Try things like \"What are my coverage limits?\" or \"Is flood damage covered?\"",
    icon: <MessageSquare className="w-6 h-6" />,
    position: "center",
  },
  {
    title: "Read Your Policy",
    description: "Click \"Read Policy\" at the top to view the full text of your policy document right here in the browser.",
    icon: <FileText className="w-6 h-6" />,
    position: "top",
  },
  {
    title: "Download PDF",
    description: "Need a copy? Click \"Download PDF\" to save your policy document to your device.",
    icon: <Download className="w-6 h-6" />,
    position: "top",
  },
  {
    title: "View History",
    description: "Click \"My History\" in the header to see all your past questions and the answers you received.",
    icon: <History className="w-6 h-6" />,
    position: "top",
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-brand-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 flex-shrink-0">
              {current.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">{current.title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{current.description}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <button
            onClick={onComplete}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleNext}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}