import { type ComponentType, createContext, type ReactNode } from 'react';

export interface SettingsExtension {
  id: string;
  label: ReactNode;
  icon: ReactNode;
  component: ComponentType<{
    namespaceId: string;
    /** Switches the settings dialog to another tab, e.g. `localRuntime`. */
    navigate: (tab: string) => void;
  }>;
}

export const SettingsExtensionsContext = createContext<
  readonly SettingsExtension[]
>([]);
