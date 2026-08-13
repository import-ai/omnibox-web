import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useSidebar } from '@/components/ui/Sidebar';

import {
  readSidebarSessionState,
  writeSidebarSessionState,
} from './sidebarSessionState';

/** Restores and persists the workspace sidebar layout for the current tab. */
export default function SidebarStatePersistence() {
  const { open, setOpen, setWidth, width } = useSidebar();
  const restoredRef = useRef(false);
  const [restored, setRestored] = useState(false);

  useLayoutEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const state = readSidebarSessionState();
    setOpen(state.open);
    setWidth(state.width);
    setRestored(true);
  }, [setOpen, setWidth]);

  useEffect(() => {
    if (!restored) return;
    writeSidebarSessionState({ open, width });
  }, [open, restored, width]);

  return null;
}
