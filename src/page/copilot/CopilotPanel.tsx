import {
  CSSProperties,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/Breadcrumb';
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { cn } from '@/lib/utils';
import Actions from '@/page/chat/header/Actions';
import Title from '@/page/chat/header/title';
import { useChatTitle } from '@/page/chat/header/useChatTitle';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import CopilotToggleButton from './CopilotToggleButton';
import CopilotView from './CopilotView';
import {
  COPILOT_PANEL_TRANSITION_MS,
  useCopilotPanelLayout,
} from './useCopilotPanelLayout';

interface CopilotPanelProps {
  namespaceId: string;
  /** Parent Workspace already provides page padding + gutter. */
  flush?: boolean;
}

function CopilotPanelContent({ namespaceId }: { namespaceId: string }) {
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const showHome = useCopilotStore(state => state.showHome);
  const showHistory = useCopilotStore(state => state.showHistory);
  const homePage = workspace.view === 'home';
  const conversationsPage = workspace.view === 'history';
  const conversationId =
    workspace.view === 'conversation' ? (workspace.conversationId ?? '') : '';
  const { chatTitle } = useChatTitle(namespaceId, conversationId);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white dark:bg-background">
      <header className="sticky top-0 z-[30] flex min-h-12 shrink-0 flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-background">
        <div className="flex min-w-0 flex-1 items-center gap-1 px-3 sm:gap-2">
          <CopilotToggleButton namespaceId={namespaceId} />
          {conversationId && (
            <Breadcrumb className="min-w-0">
              <BreadcrumbList>
                <BreadcrumbItem className="min-w-0">
                  <Title
                    data={chatTitle}
                    namespaceId={namespaceId}
                    conversationId={conversationId}
                  />
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
        <div className="ml-auto shrink-0 pr-3">
          <Actions
            compact
            homePage={homePage}
            chatTitle={chatTitle}
            namespaceId={namespaceId}
            conversationId={conversationId}
            conversationsPage={conversationsPage}
            onChatCreate={() => {
              resetChatForNamespaceSwitch(namespaceId);
              showHome(namespaceId);
            }}
            onChatHistory={() => showHistory(namespaceId)}
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <CopilotView namespaceId={namespaceId} />
      </div>
    </div>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(element => !element.hasAttribute('disabled'));
}

function useFocusRestore(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);
}

function useOverlayInteraction(
  active: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const firstFocusable = panel && getFocusableElements(panel)[0];
      (firstFocusable ?? panel)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab' && panel) {
        const focusable = getFocusableElements(panel);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) event.preventDefault();
        else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onClose, panelRef]);
}

/** Freeze width while closing so content cannot reflow mid-animation. */
function useFrozenPanelWidth(open: boolean, width: number) {
  const [frozenWidth, setFrozenWidth] = useState(width);
  useEffect(() => {
    if (open) setFrozenWidth(width);
  }, [open, width]);
  return open ? width : frozenWidth;
}

export default function CopilotPanel({ namespaceId }: CopilotPanelProps) {
  const { t } = useTranslation();
  const open = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const close = useCopilotStore(state => state.close);
  // Mounting while already open (e.g. leaving chat citation for a resource)
  // should not replay the slide-in; only animate when opening from closed.
  const [ready, setReady] = useState(() => open);
  const panelRef = useRef<HTMLElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);
  const { layout, setPanelElement: observePanelElement } =
    useCopilotPanelLayout();
  const split = layout.mode === 'split';
  const modal = !split;
  const visible = ready && open;
  const panelWidth = useFrozenPanelWidth(visible, layout.panelWidth);
  const handleClose = useCallback(
    () => close(namespaceId),
    [close, namespaceId]
  );

  useEffect(() => {
    // Split: measure workspace via the empty gap (Sidebar-style spacer).
    // Overlay: measure via the fixed panel itself.
    observePanelElement(split ? gapRef.current : panelRef.current);
  }, [observePanelElement, split, visible]);

  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !open);
  }, [open]);

  useEffect(() => {
    if (ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  useFocusRestore(open);
  useOverlayInteraction(open && modal, panelRef, handleClose);

  // Match left Sidebar: panel keeps a constant pixel width; only transform /
  // off-canvas position animates. Never transition width on the panel itself.
  const panelStyle: CSSProperties = split
    ? {
        width: panelWidth,
        minWidth: panelWidth,
        maxWidth: panelWidth,
        top: 8,
        right: 8,
        bottom: 8,
        transitionDuration: `${COPILOT_PANEL_TRANSITION_MS}ms`,
      }
    : {
        width: layout.mode === 'fullscreen' ? '100dvw' : panelWidth,
        maxWidth: '100dvw',
        transitionDuration: `${COPILOT_PANEL_TRANSITION_MS}ms`,
      };

  return (
    <>
      {visible && modal && (
        <button
          aria-label={t('copilot.collapse')}
          className="fixed inset-0 z-40 cursor-default bg-black/20 motion-safe:animate-in motion-safe:fade-in-0"
          onClick={handleClose}
          type="button"
        />
      )}
      {/* Empty flex spacer only — same role as Sidebar's offcanvas gap. */}
      {split && (
        <div
          aria-hidden
          className="pointer-events-none shrink-0 ease-linear transition-[width]"
          ref={gapRef}
          style={{
            width: visible ? panelWidth : 0,
            transitionDuration: `${COPILOT_PANEL_TRANSITION_MS}ms`,
          }}
        />
      )}
      {/*
        Fixed panel (like Sidebar's fixed offcanvas pane): width never animates,
        so text wrapping stays put while the pane slides away.
      */}
      <aside
        aria-hidden={!open}
        aria-label={t('copilot.title')}
        aria-modal={modal ? true : undefined}
        className={cn(
          'flex min-h-0 flex-col overflow-hidden bg-white ease-linear transition-transform dark:bg-background',
          split
            ? 'fixed z-20 rounded-2xl'
            : cn(
                'fixed inset-y-0 right-0 z-50 h-[100dvh] shadow-lg',
                layout.mode === 'fullscreen' ? 'rounded-none' : 'rounded-l-2xl'
              ),
          visible ? 'translate-x-0' : 'pointer-events-none translate-x-full',
          !visible && modal && 'invisible'
        )}
        data-layout={layout.mode}
        ref={panelRef}
        role={modal ? 'dialog' : 'complementary'}
        style={panelStyle}
        tabIndex={modal ? -1 : undefined}
      >
        <div className="flex h-full min-h-0 w-full min-w-[100%] max-w-[100%] flex-col">
          <CopilotPanelContent namespaceId={namespaceId} />
        </div>
      </aside>
    </>
  );
}
