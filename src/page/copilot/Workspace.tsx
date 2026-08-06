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

import { Skeleton } from '@/components/ui/Skeleton';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import { useCopilotPanelLayout } from './useCopilotPanelLayout';

const CitationResourcePreview = lazy(() => import('./CitationResourcePreview'));
const CopilotPanel = lazy(() => import('./CopilotPanel'));

interface WorkspaceLifecycleProps {
  isChatHistory: boolean;
  isChatHome: boolean;
  isChatRoute: boolean;
  isMobile: boolean;
  locationKey: string;
  namespaceId: string;
  pathname: string;
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

function WorkspaceFallback() {
  return (
    <div
      className="m-2 flex min-w-0 flex-1 flex-col gap-3 rounded-2xl bg-background p-4"
      role="status"
    >
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function useWorkspaceLifecycle({
  isChatHistory,
  isChatHome,
  isChatRoute,
  isMobile,
  locationKey,
  namespaceId,
  pathname,
  previewResourceId,
  showChatBesidePreview,
  workspaceOpen,
}: WorkspaceLifecycleProps) {
  const previousPathnameRef = useRef(pathname);
  const [copilotMounted, setCopilotMounted] = useState(workspaceOpen);
  const reset = useCopilotStore(state => state.reset);
  const closePreview = useCopilotStore(state => state.closePreview);
  const close = useCopilotStore(state => state.close);

  useLayoutEffect(() => {
    const routeChanged = previousPathnameRef.current !== pathname;
    if (namespaceId && routeChanged && !isChatRoute && previewResourceId) {
      const isEditingPreview =
        pathname === `/${namespaceId}/${previewResourceId}/edit`;
      if (isEditingPreview) closePreview(namespaceId);
      else reset(namespaceId);
    }
    previousPathnameRef.current = pathname;
  }, [
    closePreview,
    isChatRoute,
    namespaceId,
    pathname,
    previewResourceId,
    reset,
  ]);

  useEffect(() => {
    if (isChatHome || isChatHistory) reset(namespaceId);
  }, [isChatHistory, isChatHome, locationKey, namespaceId, reset]);

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
        'flex min-w-0 flex-1 overflow-hidden',
        sideBySide && 'gap-2 p-2'
      )}
    >
      {previewResourceId && (
        <Suspense fallback={<WorkspaceFallback />}>
          <CitationResourcePreview
            namespaceId={namespaceId}
            resourceId={previewResourceId}
            flush={sideBySide}
          />
        </Suspense>
      )}
      <div
        className={cn(
          'flex min-w-0',
          chatPreviewRoute
            ? 'shrink-0 overflow-hidden motion-safe:transition-[width,transform] motion-safe:duration-200 motion-safe:ease-linear'
            : 'flex-1',
          chatPreviewRoute &&
            !isMobile &&
            (workspaceOpen ? 'flex-none' : 'pointer-events-none flex-none'),
          chatPreviewRoute &&
            isMobile &&
            (workspaceOpen
              ? 'fixed inset-0 z-50 w-full bg-background'
              : 'invisible fixed inset-0 z-50 w-full translate-x-full bg-background'),
          previewReplacesResource && 'hidden'
        )}
        aria-hidden={chatPreviewRoute && !workspaceOpen}
        ref={setChatRouteElement}
        style={
          chatPreviewRoute && !isMobile
            ? { width: workspaceOpen ? chatPanelWidth : 0 }
            : undefined
        }
      >
        <Outlet />
      </div>
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
  const { layout, setPanelElement } = useCopilotPanelLayout();
  const chatRoot = `/${namespaceId}/chat`;
  const isChatHome = location.pathname === chatRoot;
  const isChatHistory = location.pathname === `${chatRoot}/conversations`;
  const isChatRoute =
    isChatHome || location.pathname.startsWith(`${chatRoot}/`);
  const showPreview = Boolean(workspace.previewResourceId);
  const previewReplacesResource = showPreview && !isChatRoute;
  const chatPreviewRoute = showPreview && isChatRoute;
  const showChatBesidePreview = showPreview && isChatRoute && workspace.open;
  const showCopilotBesideResource = !isChatRoute && workspace.open;
  const showCopilotSidePanel =
    showChatBesidePreview || showCopilotBesideResource;
  const sideBySide = showCopilotSidePanel;
  const copilotMounted = useWorkspaceLifecycle({
    isChatHistory,
    isChatHome,
    isChatRoute,
    isMobile,
    locationKey: location.key,
    namespaceId,
    pathname: location.pathname,
    previewResourceId: workspace.previewResourceId,
    showChatBesidePreview,
    workspaceOpen: workspace.open,
  });
  // Chat routes keep their existing Outlet as the only conversation instance.
  const keepCopilotMounted = copilotMounted && !isChatRoute;
  const setChatRouteElement = useCallback(
    (element: HTMLDivElement | null) => {
      setPanelElement(element);
      element?.toggleAttribute('inert', chatPreviewRoute && !workspace.open);
    },
    [chatPreviewRoute, setPanelElement, workspace.open]
  );

  return (
    <WorkspaceContent
      chatPanelWidth={layout.panelWidth}
      chatPreviewRoute={chatPreviewRoute}
      isMobile={isMobile}
      keepCopilotMounted={keepCopilotMounted}
      namespaceId={namespaceId}
      previewReplacesResource={previewReplacesResource}
      previewResourceId={workspace.previewResourceId}
      setChatRouteElement={setChatRouteElement}
      sideBySide={sideBySide}
      workspaceOpen={workspace.open}
    />
  );
}
