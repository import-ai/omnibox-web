import { type ComponentType, createContext, type ReactNode } from 'react';

export interface SettingsExtension {
  id: string;
  label: ReactNode;
  icon: ReactNode;
  component: ComponentType<{ namespaceId: string }>;
}

export const SettingsExtensionsContext = createContext<
  readonly SettingsExtension[]
>([]);
