"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Important Notice</h2>
        </div>

        <div className="text-sm text-gray-600 leading-relaxed space-y-3">
          <p>
            The information provided herein is for informational purposes only
            and your policy terms and conditions govern any coverage.
          </p>
          <p>
            If after reading your policy, you have any additional questions,
            you should contact your agency during normal business hours.
          </p>
          <p className="text-xs text-gray-400">
            By clicking "I Acknowledge" below, you confirm that you understand
            the above and wish to proceed.
          </p>
        </div>

        <button
          onClick={onAccept}
          className="mt-6 w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 transition text-sm"
        >
          I Acknowledge
        </button>
      </div>
    </div>
  );
}