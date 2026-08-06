import { useCallback, useEffect, useState } from 'react';

export type CopilotPanelLayoutMode = 'fullscreen' | 'overlay' | 'split';

export interface CopilotPanelLayout {
  mode: CopilotPanelLayoutMode;
  panelWidth: number;
}

/** Shared max width for resource-side Copilot and chat citation split. */
export const COPILOT_PANEL_MAX_WIDTH = 380;

const OVERLAY_MIN_WIDTH = 768;
const SPLIT_MIN_WIDTH = 1100;
const OVERLAY_WIDTH = COPILOT_PANEL_MAX_WIDTH;
const SPLIT_MIN_PANEL_WIDTH = 340;
const SPLIT_MAX_PANEL_WIDTH = COPILOT_PANEL_MAX_WIDTH;
const SPLIT_WIDTH_RATIO = 0.32;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Resolves the Copilot presentation from the available workspace width. */
export function getCopilotPanelLayout(
  availableWidth: number
): CopilotPanelLayout {
  const width = Number.isFinite(availableWidth)
    ? Math.max(0, availableWidth)
    : 0;
  if (width < OVERLAY_MIN_WIDTH) {
    return { mode: 'fullscreen', panelWidth: width };
  }
  if (width < SPLIT_MIN_WIDTH) {
    return { mode: 'overlay', panelWidth: Math.min(width, OVERLAY_WIDTH) };
  }
  return {
    mode: 'split',
    panelWidth: Math.round(
      clamp(
        width * SPLIT_WIDTH_RATIO,
        SPLIT_MIN_PANEL_WIDTH,
        SPLIT_MAX_PANEL_WIDTH
      )
    ),
  };
}

function getInitialLayout() {
  return getCopilotPanelLayout(
    typeof window === 'undefined' ? 0 : window.innerWidth
  );
}

export function useCopilotPanelLayout() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState(getInitialLayout);
  const setPanelElement = useCallback((element: HTMLElement | null) => {
    setHost(element?.parentElement ?? null);
  }, []);

  useEffect(() => {
    if (!host) return;
    const update = (width: number) => {
      const next = getCopilotPanelLayout(width);
      setLayout(current =>
        current.mode === next.mode && current.panelWidth === next.panelWidth
          ? current
          : next
      );
    };
    const measure = () => {
      update(host.getBoundingClientRect().width || window.innerWidth);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number') update(width);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [host]);

  return { layout, setPanelElement };
}
