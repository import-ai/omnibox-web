import {
  CSSProperties,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { cn } from '@/lib/utils';
import Actions from '@/page/chat/header/Actions';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import CopilotToggleButton from './CopilotToggleButton';
import CopilotView from './CopilotView';
import { useCopilotPanelLayout } from './useCopilotPanelLayout';

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

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white dark:bg-background">
      <header className="sticky top-0 z-[30] flex min-h-12 shrink-0 flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-background">
        <div className="flex flex-1 items-center gap-1 px-3 sm:gap-2">
          <CopilotToggleButton namespaceId={namespaceId} />
        </div>
        <div className="ml-auto pr-3">
          <Actions
            compact
            homePage={homePage}
            chatTitle=""
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
  panelRef: RefObject<HTMLElement>,
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

export default function CopilotPanel({
  namespaceId,
  flush = false,
}: CopilotPanelProps) {
  const { t } = useTranslation();
  const open = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const close = useCopilotStore(state => state.close);
  const [ready, setReady] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const { layout, setPanelElement: observePanelElement } =
    useCopilotPanelLayout();
  const modal = layout.mode !== 'split';
  const visible = ready && open;
  const handleClose = useCallback(
    () => close(namespaceId),
    [close, namespaceId]
  );
  const setPanelElement = useCallback(
    (element: HTMLElement | null) => {
      panelRef.current = element;
      observePanelElement(element);
    },
    [observePanelElement]
  );

  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !open);
  }, [open]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useFocusRestore(open);
  useOverlayInteraction(open && modal, panelRef, handleClose);

  const style: CSSProperties =
    layout.mode === 'split'
      ? {
          marginRight: visible && !flush ? 8 : 0,
          width: visible ? layout.panelWidth : 0,
        }
      : {
          maxWidth: '100dvw',
          width: layout.mode === 'fullscreen' ? '100dvw' : layout.panelWidth,
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
      <aside
        aria-hidden={!open}
        aria-label={t('copilot.title')}
        aria-modal={modal ? true : undefined}
        className={cn(
          'flex min-w-0 shrink-0 overflow-hidden bg-white motion-safe:transition-[width,margin,transform] motion-safe:duration-200 motion-safe:ease-linear dark:bg-background',
          layout.mode === 'split'
            ? cn('relative rounded-2xl', flush ? 'm-0' : 'my-2')
            : 'fixed inset-y-0 right-0 z-50 h-[100dvh] shadow-lg',
          layout.mode === 'fullscreen' ? 'rounded-none' : 'rounded-l-2xl',
          visible
            ? 'visible translate-x-0'
            : cn(
                'pointer-events-none',
                modal ? 'invisible translate-x-full' : 'translate-x-0'
              )
        )}
        data-layout={layout.mode}
        ref={setPanelElement}
        role={modal ? 'dialog' : 'complementary'}
        style={style}
        tabIndex={modal ? -1 : undefined}
      >
        <CopilotPanelContent namespaceId={namespaceId} />
      </aside>
    </>
  );
}
