
import React from 'react';

interface ToastProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  messages: {
    loading: string;
    success: string;
    error: string;
  };
  className?: string;
}

const Toast: React.FC<ToastProps> = ({ status, messages, className }) => {
  if (status === 'idle') return null;

  const bgClass = status === 'loading' ? 'bg-indigo-600' : status === 'success' ? 'bg-emerald-600' : 'bg-rose-600';
  const message = messages[status as keyof typeof messages];

  return (
    <div className={`fixed right-8 z-50 p-4 rounded-lg text-white font-semibold shadow-2xl transition-all duration-300 ${bgClass} ${className}`}>
      {status === 'loading' && <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
      {message}
    </div>
  );
};

export default Toast;
