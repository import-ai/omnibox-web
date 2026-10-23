import { createContext, type ReactNode, useCallback, useContext } from 'react';
import { toast } from 'sonner';

type ToastType = 'success' | 'error';

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

export function SettingsToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType) => {
    toast[type](message, { position: 'bottom-right' });
  }, []);

  return (
    <SettingsToastContext.Provider value={{ showToast }}>
      {children}
    </SettingsToastContext.Provider>
  );
}
