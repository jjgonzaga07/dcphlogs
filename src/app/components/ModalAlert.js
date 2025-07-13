import React from 'react';

export default function ModalAlert({ open, message, onClose, type = 'error' }) {
  if (!open) return null;
  let color = '#dc2626'; // red for error
  if (type === 'success') color = '#16a34a';
  if (type === 'info') color = '#2563eb';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/10">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-xs animate-fade-in flex flex-col items-center">
        <div className="mb-4">
          <svg className="h-10 w-10" fill="none" stroke={color} viewBox="0 0 24 24">
            {type === 'error' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
            {type === 'success' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
            {type === 'info' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </div>
        <div className="text-center text-[#14206e] mb-6 text-base font-medium">
          {message}
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-[#14206e] hover:bg-[#0f1a5a] text-white rounded-lg text-sm font-medium transition-all duration-200"
        >
          OK
        </button>
      </div>
    </div>
  );
} 