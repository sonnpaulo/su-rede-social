import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types';

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const handleToast = (e: CustomEvent<ToastMessage>) => {
            const newToast = e.detail;
            setToasts((prev) => [...prev, newToast]);

            // Auto remove após 3 segundos
            setTimeout(() => {
                setToasts((prev) => prev.filter(t => t.id !== newToast.id));
            }, 3000);
        };

        window.addEventListener('show-toast', handleToast as EventListener);
        return () => window.removeEventListener('show-toast', handleToast as EventListener);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col space-y-2 w-full max-w-sm px-4">
            {toasts.map((toast) => (
                <div 
                    key={toast.id}
                    className={`flex items-center p-4 rounded-lg shadow-lg border animate-slide-down ${
                        toast.type === 'success' ? 'bg-white border-green-200 text-green-800' :
                        toast.type === 'error' ? 'bg-white border-red-200 text-red-800' :
                        'bg-white border-blue-200 text-blue-800'
                    }`}
                >
                    <div className="flex-shrink-0 mr-3">
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="flex-1 text-sm font-medium">{toast.message}</div>
                    <button 
                        onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};