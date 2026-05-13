import { createContext, useCallback, useContext, useState } from 'react';

import { CompletedStatus } from '@/assets/icons/completedStatus';
import { ErrorStatus } from '@/assets/icons/errorStatus';

type ToastType = 'success' | 'error';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface SettingsToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const SettingsToastContext = createContext<SettingsToastContextType | null>(
  null
);

export function useSettingsToast() {
  const context = useContext(SettingsToastContext);
  if (!context) {
    throw new Error(
      'useSettingsToast must be used within a SettingsToastProvider'
    );
  }
  return context;
}

export function SettingsToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  return (
    <SettingsToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 shadow-lg dark:border-border dark:bg-neutral-900">
            {toast.type === 'success' ? <CompletedStatus /> : <ErrorStatus />}
            <span className="text-sm font-medium text-foreground">
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </SettingsToastContext.Provider>
  );
}
