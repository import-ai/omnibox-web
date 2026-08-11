import { useCallback, useEffect, useState } from 'react';

export type CopilotPanelLayoutMode = 'fullscreen' | 'overlay' | 'split';

export interface CopilotPanelLayout {
  mode: CopilotPanelLayoutMode;
  panelWidth: number;
}

/** Shared max width for resource-side Copilot and chat citation split. */
export const COPILOT_PANEL_MAX_WIDTH = 380;

/** Keep in sync with Sidebar offcanvas (`duration-200`). */
export const COPILOT_PANEL_TRANSITION_MS = 200;

/** Phone viewport: full-screen drawer. Aligns with `useIsMobile`. */
const PHONE_MAX_WIDTH = 768;
/** Tablet / iPad viewport: side drawer. Desktop (`>= 1024`) stays split. */
const TABLET_MAX_WIDTH = 1024;
const OVERLAY_WIDTH = COPILOT_PANEL_MAX_WIDTH;
const SPLIT_MIN_PANEL_WIDTH = 340;
const SPLIT_MAX_PANEL_WIDTH = COPILOT_PANEL_MAX_WIDTH;
const SPLIT_WIDTH_RATIO = 0.32;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeWidth(width: number) {
  return Number.isFinite(width) ? Math.max(0, width) : 0;
}

/**
 * Resolves Copilot presentation.
 * Mode follows viewport (phone / iPad / desktop); split panel width follows
 * workspace width so a narrowed desktop content area stays split.
 */
export function getCopilotPanelLayout(
  viewportWidth: number,
  workspaceWidth = viewportWidth
): CopilotPanelLayout {
  const viewport = normalizeWidth(viewportWidth);
  const workspace = normalizeWidth(
    workspaceWidth > 0 ? workspaceWidth : viewportWidth
  );

  if (viewport < PHONE_MAX_WIDTH) {
    return { mode: 'fullscreen', panelWidth: viewport };
  }
  if (viewport < TABLET_MAX_WIDTH) {
    return {
      mode: 'overlay',
      panelWidth: Math.min(viewport, OVERLAY_WIDTH),
    };
  }
  return {
    mode: 'split',
    panelWidth: Math.round(
      clamp(
        workspace * SPLIT_WIDTH_RATIO,
        SPLIT_MIN_PANEL_WIDTH,
        SPLIT_MAX_PANEL_WIDTH
      )
    ),
  };
}

function getInitialLayout() {
  const viewport = typeof window === 'undefined' ? 0 : window.innerWidth;
  return getCopilotPanelLayout(viewport);
}

export function useCopilotPanelLayout() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState(getInitialLayout);
  const setPanelElement = useCallback((element: HTMLElement | null) => {
    setHost(element?.parentElement ?? null);
  }, []);

  useEffect(() => {
    if (!host) return;

    let workspaceWidth =
      host.getBoundingClientRect().width || window.innerWidth;

    const apply = () => {
      const next = getCopilotPanelLayout(window.innerWidth, workspaceWidth);
      setLayout(current =>
        current.mode === next.mode && current.panelWidth === next.panelWidth
          ? current
          : next
      );
    };

    const onViewportResize = () => apply();
    const onWorkspaceResize = (width: number) => {
      workspaceWidth = width > 0 ? width : window.innerWidth;
      apply();
    };

    apply();
    window.addEventListener('resize', onViewportResize);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', onViewportResize);
    }

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number') onWorkspaceResize(width);
    });
    observer.observe(host);
    return () => {
      window.removeEventListener('resize', onViewportResize);
      observer.disconnect();
    };
  }, [host]);

  return { layout, setPanelElement };
}
