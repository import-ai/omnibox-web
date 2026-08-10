import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import Loading from '@/components/loading';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

import {
  defaultCopilotWorkspace,
  getCopilotWorkspace,
  useCopilotStore,
} from './copilotStore';
import {
  COPILOT_PANEL_TRANSITION_MS,
  useCopilotPanelLayout,
} from './useCopilotPanelLayout';

const CitationResourcePreview = lazy(() => import('./CitationResourcePreview'));
const CopilotPanel = lazy(() => import('./CopilotPanel'));

/** Stay true through normal close animations, with an immediate route-handoff escape. */
function useDeferredOpen(open: boolean, closeImmediately = false) {
  const [deferredOpen, setDeferredOpen] = useState(open);
  useLayoutEffect(() => {
    if (!open && closeImmediately) setDeferredOpen(false);
  }, [closeImmediately, open]);
  useEffect(() => {
    if (open) {
      setDeferredOpen(true);
      return;
    }
    if (closeImmediately) return;
    const timer = window.setTimeout(
      () => setDeferredOpen(false),
      COPILOT_PANEL_TRANSITION_MS
    );
    return () => window.clearTimeout(timer);
  }, [closeImmediately, open]);
  return !open && closeImmediately ? false : deferredOpen;
}

interface WorkspaceLifecycleProps {
  isChatHistory: boolean;
  isChatHome: boolean;
  isChatRoute: boolean;
  isMobile: boolean;
  locationKey: string;
  namespaceId: string;
  pathname: string;
  pendingExpandFromResource: boolean;
  previewResourceId: string | null;
  showChatBesidePreview: boolean;
  workspaceOpen: boolean;
}

interface WorkspaceContentProps {
  chatPanelWidth: number;
  chatPreviewRoute: boolean;
  isMobile: boolean;
  keepCopilotMounted: boolean;
  namespaceId: string;
  previewReplacesResource: boolean;
  previewResourceId: string | null;
  setChatRouteElement: (element: HTMLDivElement | null) => void;
  sideBySide: boolean;
  workspaceOpen: boolean;
}

function useWorkspaceLifecycle({
  isChatHistory,
  isChatHome,
  isChatRoute,
  isMobile,
  locationKey,
  namespaceId,
  pathname,
  pendingExpandFromResource,
  previewResourceId,
  showChatBesidePreview,
  workspaceOpen,
}: WorkspaceLifecycleProps) {
  const previousPathnameRef = useRef(pathname);
  const [copilotMounted, setCopilotMounted] = useState(workspaceOpen);
  const reset = useCopilotStore(state => state.reset);
  const closePreview = useCopilotStore(state => state.closePreview);
  const clearPendingExpandFromResource = useCopilotStore(
    state => state.clearPendingExpandFromResource
  );
  const close = useCopilotStore(state => state.close);

  useLayoutEffect(() => {
    const routeChanged = previousPathnameRef.current !== pathname;
    if (namespaceId && routeChanged && !isChatRoute && previewResourceId) {
      // Leave citation preview when the route changes (sidebar switch, edit,
      // save). Keep the Copilot conversation open beside the new page.
      closePreview(namespaceId);
    }
    previousPathnameRef.current = pathname;
  }, [closePreview, isChatRoute, namespaceId, pathname, previewResourceId]);

  // Finish "close current resource" only after the chat route is active so the
  // previously hidden resource Outlet never paints between preview teardown and
  // navigation.
  useLayoutEffect(() => {
    if (!isChatRoute || !pendingExpandFromResource) return;
    closePreview(namespaceId);
    clearPendingExpandFromResource(namespaceId);
  }, [
    clearPendingExpandFromResource,
    closePreview,
    isChatRoute,
    namespaceId,
    pendingExpandFromResource,
  ]);

  useEffect(() => {
    if (isChatHome || isChatHistory) reset(namespaceId);
  }, [isChatHistory, isChatHome, locationKey, namespaceId, reset]);

  // After "close current resource" navigates to full-page chat, drop the panel
  // flag once the chat route is active (no intermediate resource-only frame).
  useEffect(() => {
    if (
      !isChatRoute ||
      !workspaceOpen ||
      previewResourceId ||
      pendingExpandFromResource
    ) {
      return;
    }
    close(namespaceId);
  }, [
    close,
    isChatRoute,
    namespaceId,
    pendingExpandFromResource,
    previewResourceId,
    workspaceOpen,
  ]);

  useEffect(() => {
    if (workspaceOpen) setCopilotMounted(true);
  }, [workspaceOpen]);

  useEffect(() => {
    if (!isMobile || !showChatBesidePreview) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(namespaceId);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [close, isMobile, namespaceId, showChatBesidePreview]);

  return copilotMounted;
}

function WorkspaceContent({
  chatPanelWidth,
  chatPreviewRoute,
  isMobile,
  keepCopilotMounted,
  namespaceId,
  previewReplacesResource,
  previewResourceId,
  setChatRouteElement,
  sideBySide,
  workspaceOpen,
}: WorkspaceContentProps) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-1 overflow-hidden',
        sideBySide && 'gap-2 p-2'
      )}
    >
      {previewResourceId && (
        <Suspense fallback={<Loading />}>
          <CitationResourcePreview
            namespaceId={namespaceId}
            resourceId={previewResourceId}
            flush={sideBySide}
          />
        </Suspense>
      )}
      {/*
        Chat citation split: empty width spacer + absolute sliding pane
        (Sidebar offcanvas pattern). Avoid clipping the pane inside the spacer.
      */}
      {chatPreviewRoute && !isMobile ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none shrink-0 ease-linear transition-[width]"
            ref={setChatRouteElement}
            style={{
              width: workspaceOpen ? chatPanelWidth : 0,
              transitionDuration: `${COPILOT_PANEL_TRANSITION_MS}ms`,
            }}
          />
          <div
            aria-hidden={!workspaceOpen}
            className={cn(
              'fixed bottom-2 right-2 top-2 z-20 flex min-h-0 flex-col ease-linear transition-transform',
              workspaceOpen
                ? 'translate-x-0'
                : 'pointer-events-none translate-x-full'
            )}
            ref={element => {
              element?.toggleAttribute('inert', !workspaceOpen);
            }}
            style={{
              width: chatPanelWidth,
              minWidth: chatPanelWidth,
              maxWidth: chatPanelWidth,
              transitionDuration: `${COPILOT_PANEL_TRANSITION_MS}ms`,
            }}
          >
            <Outlet />
          </div>
        </>
      ) : (
        <div
          className={cn(
            'flex min-w-0',
            chatPreviewRoute ? 'shrink-0' : 'flex-1',
            chatPreviewRoute &&
              isMobile &&
              (workspaceOpen
                ? 'fixed inset-0 z-50 w-full bg-background'
                : 'invisible fixed inset-0 z-50 w-full translate-x-full bg-background'),
            previewReplacesResource && 'hidden'
          )}
          aria-hidden={chatPreviewRoute && !workspaceOpen}
          ref={setChatRouteElement}
        >
          <Outlet />
        </div>
      )}
      {keepCopilotMounted && (
        <Suspense fallback={null}>
          <CopilotPanel namespaceId={namespaceId} flush={sideBySide} />
        </Suspense>
      )}
    </div>
  );
}

export default function Workspace() {
  const location = useLocation();
  const params = useParams();
  const isMobile = useIsMobile();
  const namespaceId = params.namespace_id || '';
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const pendingExpandFromResource = useCopilotStore(
    state => !!state.pendingExpandFromResource[namespaceId]
  );
  const { layout, setPanelElement } = useCopilotPanelLayout();
  const chatRoot = `/${namespaceId}/chat`;
  const isChatHome = location.pathname === chatRoot;
  const isChatHistory = location.pathname === `${chatRoot}/conversations`;
  const isChatRoute =
    isChatHome || location.pathname.startsWith(`${chatRoot}/`);
  const routeResetsWorkspace = isChatHome || isChatHistory;
  const renderWorkspace = routeResetsWorkspace
    ? defaultCopilotWorkspace
    : workspace;
  const showPreview = Boolean(renderWorkspace.previewResourceId);
  // Keep the resource Outlet covered while expanding, even if preview was
  // already cleared, and suppress citation-split chrome on the chat landing frame.
  const previewReplacesResource =
    (showPreview || pendingExpandFromResource) && !isChatRoute;
  const chatPreviewRoute =
    showPreview && isChatRoute && !pendingExpandFromResource;
  const visiblePreviewResourceId =
    showPreview && !(pendingExpandFromResource && isChatRoute)
      ? renderWorkspace.previewResourceId
      : null;
  const showChatBesidePreview = chatPreviewRoute && renderWorkspace.open;
  const showCopilotBesideResource = !isChatRoute && renderWorkspace.open;
  const wantsSideBySide = showChatBesidePreview || showCopilotBesideResource;
  // Keep page padding through the close animation so layout doesn't jump.
  const sideBySide = useDeferredOpen(
    wantsSideBySide,
    isChatRoute && pendingExpandFromResource
  );
  const copilotMounted = useWorkspaceLifecycle({
    isChatHistory,
    isChatHome,
    isChatRoute,
    isMobile,
    locationKey: location.key,
    namespaceId,
    pathname: location.pathname,
    pendingExpandFromResource,
    previewResourceId: workspace.previewResourceId,
    showChatBesidePreview,
    workspaceOpen: workspace.open,
  });
  // Chat routes keep their existing Outlet as the only conversation instance.
  const keepCopilotMounted = copilotMounted && !isChatRoute;
  // Prefetch so the first chat-citation → resource handoff does not flash an
  // empty Suspense gap while CopilotPanel's chunk loads.
  useEffect(() => {
    if (!chatPreviewRoute || !renderWorkspace.open) return;
    void import('./CopilotPanel');
  }, [chatPreviewRoute, renderWorkspace.open]);
  const setChatRouteElement = useCallback(
    (element: HTMLDivElement | null) => {
      setPanelElement(element);
      // Desktop citation split marks inert on the sliding pane instead.
      if (isMobile || !chatPreviewRoute) {
        element?.toggleAttribute(
          'inert',
          chatPreviewRoute && !renderWorkspace.open
        );
      } else {
        element?.removeAttribute('inert');
      }
    },
    [chatPreviewRoute, isMobile, renderWorkspace.open, setPanelElement]
  );

  return (
    <WorkspaceContent
      chatPanelWidth={layout.panelWidth}
      chatPreviewRoute={chatPreviewRoute}
      isMobile={isMobile}
      keepCopilotMounted={keepCopilotMounted}
      namespaceId={namespaceId}
      previewReplacesResource={previewReplacesResource}
      previewResourceId={visiblePreviewResourceId}
      setChatRouteElement={setChatRouteElement}
      sideBySide={sideBySide}
      workspaceOpen={renderWorkspace.open}
    />
  );
}
