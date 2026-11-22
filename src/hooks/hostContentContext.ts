import { createContext, type ReactNode } from 'react';

export interface HostContent {
  sidebarFooter?: ReactNode;
  about?: ReactNode;
}

export const HostContentContext = createContext<HostContent | undefined>(
  undefined
);
