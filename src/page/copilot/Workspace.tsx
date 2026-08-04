import {
  lazy,
  Suspense,
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

const CitationResourcePreview = lazy(() => import('./CitationResourcePreview'));
const CopilotPanel = lazy(() => import('./CopilotPanel'));

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

export default function Workspace() {
  const location = useLocation();
  const params = useParams();
  const isMobile = useIsMobile();
  const namespaceId = params.namespace_id || '';
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const previousPathnameRef = useRef(location.pathname);
  const [copilotMounted, setCopilotMounted] = useState(workspace.open);
  const reset = useCopilotStore(state => state.reset);
  const chatRoot = `/${namespaceId}/chat`;
  const isChatHome = location.pathname === chatRoot;
  const isChatRoute =
    isChatHome || location.pathname.startsWith(`${chatRoot}/`);
  const showPreview = Boolean(workspace.previewResourceId);
  const previewReplacesResource = showPreview && !isChatRoute;

  useLayoutEffect(() => {
    const routeChanged = previousPathnameRef.current !== location.pathname;
    if (
      namespaceId &&
      routeChanged &&
      !isChatRoute &&
      workspace.previewResourceId
    ) {
      reset(namespaceId);
    }
    previousPathnameRef.current = location.pathname;
  }, [
    isChatRoute,
    location.pathname,
    namespaceId,
    reset,
    workspace.previewResourceId,
  ]);

  useEffect(() => {
    if (isChatHome) reset(namespaceId);
  }, [isChatHome, location.key, namespaceId, reset]);

  useEffect(() => {
    if (workspace.open) setCopilotMounted(true);
  }, [workspace.open]);

  return (
    <div className="flex min-w-0 flex-1 overflow-hidden">
      {showPreview && workspace.previewResourceId && (
        <Suspense fallback={<WorkspaceFallback />}>
          <CitationResourcePreview
            namespaceId={namespaceId}
            resourceId={workspace.previewResourceId}
          />
        </Suspense>
      )}
      <div
        className={cn(
          'flex min-w-0 flex-1',
          showPreview && isChatRoute && 'md:w-[380px] md:flex-none',
          showPreview && isChatRoute && isMobile && 'hidden',
          previewReplacesResource && 'hidden'
        )}
      >
        <Outlet />
      </div>
      {!isChatRoute && copilotMounted && (
        <Suspense fallback={null}>
          <CopilotPanel namespaceId={namespaceId} />
        </Suspense>
      )}
    </div>
  );
}
