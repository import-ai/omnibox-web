import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ResourceTasksProvider } from '@/components/attributes/resource-tasks/ResourceTasksContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Separator } from '@/components/ui/Separator';
import { SidebarInset, useSidebar } from '@/components/ui/Sidebar';
import type { IUseResource } from '@/hooks/userResource';
import useWide from '@/hooks/useWide';
import { cn } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import { COPILOT_PANEL_TRANSITION_MS } from '@/page/copilot/useCopilotPanelLayout';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';
import { useResourceBodyDragAutoScroll } from '@/page/resource/useResourceBodyDragAutoScroll';
import {
  isFolderLikeResourceType,
  resourcePaneColumnClassName,
  shouldUseFullWidthResourcePane,
  useResourcePaneLayout,
} from '@/page/resource/useResourcePaneLayout';

import {
  ResourceCommentsProvider,
  useResourceCommentsPanel,
} from './comments/ResourceCommentsContext';
import Header from './header';
import {
  setResourceRevisionQuery,
  useResourceHistoryStore,
} from './history/resourceHistoryStore';
import Wrapper from './Wrapper';

interface ResourceDetailViewProps extends IUseResource {
  error?: boolean;
  flush?: boolean;
  scrollToLine?: number;
}

/** Shared visual shell for routed resources and in-place Copilot previews. */
function ResourceDetailContent({
  error = false,
  flush = false,
  ...resourceProps
}: ResourceDetailViewProps) {
  const { t, i18n } = useTranslation();
  const { wide, onWide } = useWide();
  const { open, width: sidebarWidth } = useSidebar();
  const {
    app,
    editPage,
    forbidden,
    loading,
    namespaceId,
    notFound,
    resource,
    resourceId,
  } = resourceProps;
  const resourceMatchesTarget = resource?.id === resourceId;
  const currentResource = resourceMatchesTarget ? resource : null;
  const revisionId = new URLSearchParams(window.location.search).get(
    'revision'
  );
  const selectedRevision = useResourceHistoryStore(
    state => state.selections[`${namespaceId}:${resourceId}`]
  );
  const selectRevision = useResourceHistoryStore(state => state.selectRevision);
  const clearRevision = useResourceHistoryStore(state => state.clearRevision);
  const showHome = useCopilotStore(state => state.showHome);
  const showResourceHistory = useCopilotStore(
    state => state.showResourceHistory
  );
  const historyResourceId = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).resourceHistoryResourceId
  );
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!revisionId || selectedRevision || !currentResource) return;
    let active = true;
    import('@/service/resource')
      .then(({ fetchResourceRevision }) =>
        fetchResourceRevision(namespaceId, resourceId, revisionId)
      )
      .then(revision => {
        if (active) selectRevision(namespaceId, resourceId, revision);
      })
      .catch(() => {
        if (active) {
          setResourceRevisionQuery(null);
        }
      });
    return () => {
      active = false;
    };
  }, [
    currentResource,
    namespaceId,
    resourceId,
    revisionId,
    selectRevision,
    selectedRevision,
  ]);

  const historicalResource =
    currentResource &&
    selectedRevision &&
    selectedRevision.resource_id === currentResource.id
      ? {
          ...currentResource,
          name: selectedRevision.name,
          content: selectedRevision.content,
          content_hash: selectedRevision.content_hash,
          updated_at: selectedRevision.created_at,
          read_only: true,
        }
      : currentResource;
  const isHistorical = Boolean(
    currentResource && selectedRevision?.resource_id === currentResource.id
  );
  const currentResourceProps = {
    ...resourceProps,
    loading:
      loading ||
      (!!resourceId &&
        !resourceMatchesTarget &&
        !error &&
        !forbidden &&
        !notFound),
    resource: historicalResource,
    isHistorical,
  };
  const copilotOpen = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const [copilotLayoutOpen, setCopilotLayoutOpen] = useState(copilotOpen);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const areFeaturePreviewsLoaded = useResourceStore(
    state =>
      state.featurePreviewsUserId !== null &&
      state.featurePreviewsUserId === localStorage.getItem('uid')
  );
  const commentsPanel = useResourceCommentsPanel();
  const commentsPanelOpen = commentsPanel?.panelOpen ?? false;
  const closeCommentsPanel = commentsPanel?.setPanelOpen;
  const isFolderResource = isFolderLikeResourceType(
    currentResource?.resource_type
  );
  const useFullWidth = shouldUseFullWidthResourcePane(
    useOmniboxEditor,
    currentResource?.resource_type
  );
  const onNearBottom = useCallback(() => {
    app.fire('scroll-to-bottom');
  }, [app]);
  const { large, compactResourcePane } = useResourcePaneLayout(
    scrollContainerRef,
    { onNearBottom }
  );

  useResourceBodyDragAutoScroll(scrollContainerRef, useFullWidth && editPage);

  useEffect(() => {
    const workspace = getCopilotWorkspace(
      useCopilotStore.getState(),
      namespaceId
    );
    if (
      loading ||
      !resourceMatchesTarget ||
      !workspace.open ||
      workspace.view !== 'resource_history' ||
      workspace.resourceHistoryResourceId === resourceId
    ) {
      return;
    }
    setResourceRevisionQuery(null);
    if (
      currentResource?.resource_type === 'doc' &&
      !currentResource.read_only &&
      !editPage
    ) {
      showResourceHistory(namespaceId, resourceId);
    } else {
      showHome(namespaceId);
    }
  }, [
    currentResource,
    editPage,
    loading,
    namespaceId,
    resourceId,
    historyResourceId,
    resourceMatchesTarget,
    showHome,
    showResourceHistory,
  ]);

  useEffect(() => {
    if (
      (isFolderResource || (areFeaturePreviewsLoaded && !useOmniboxEditor)) &&
      commentsPanelOpen &&
      closeCommentsPanel
    ) {
      closeCommentsPanel(false);
    }
  }, [
    areFeaturePreviewsLoaded,
    closeCommentsPanel,
    commentsPanelOpen,
    isFolderResource,
    useOmniboxEditor,
  ]);

  useEffect(() => {
    if (copilotOpen) {
      setCopilotLayoutOpen(true);
      return;
    }
    const timer = window.setTimeout(
      () => setCopilotLayoutOpen(false),
      COPILOT_PANEL_TRANSITION_MS
    );
    return () => window.clearTimeout(timer);
  }, [copilotOpen]);

  const flushLayout = flush || copilotLayoutOpen;

  return (
    <ResourceTasksProvider
      namespaceId={namespaceId}
      resourceId={currentResource?.id ?? resourceId}
      resourceType={currentResource?.resource_type}
      onResource={currentResourceProps.onResource}
    >
      <SidebarInset
        className={cn(
          'h-full min-h-0 min-w-0 overflow-hidden rounded-[16px] bg-white dark:bg-background md:h-[calc(100svh-16px)]',
          compactResourcePane && 'resource-detail-view--compact',
          flushLayout ? 'm-0 md:h-full' : 'm-[8px]'
        )}
        style={
          {
            '--resource-toc-left': `${(open ? sidebarWidth : 0) + 16}px`,
          } as CSSProperties
        }
      >
        <Header {...currentResourceProps} onWide={onWide} wide={wide} />
        {selectedRevision && historicalResource ? (
          <div className="flex min-h-10 items-center gap-3 border-y border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">
              {t('resource.history.historical_version')} ·{' '}
              {new Intl.DateTimeFormat(
                i18n?.language?.startsWith('zh') ? 'zh-CN' : 'en-US',
                {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }
              ).format(new Date(selectedRevision.created_at))}
              {selectedRevision.author
                ? ` · ${selectedRevision.author.username}`
                : ''}
            </span>
            <button
              className="shrink-0 font-medium text-foreground hover:underline"
              onClick={() => {
                clearRevision(namespaceId, resourceId);
                setResourceRevisionQuery(null);
              }}
              type="button"
            >
              {t('resource.history.back_to_current')}
            </button>
            {(currentResource?.current_permission === 'can_edit' ||
              currentResource?.current_permission === 'full_access' ||
              !currentResource?.current_permission) && (
              <button
                className="shrink-0 font-medium text-foreground hover:underline disabled:opacity-50"
                disabled={restoring}
                onClick={() => setRestoreOpen(true)}
                type="button"
              >
                {t('resource.history.restore')}
              </button>
            )}
          </div>
        ) : null}
        <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
        <div
          className={cn(
            'no-scrollbar flex min-w-0 flex-1 justify-center overflow-x-hidden overflow-y-auto p-4',
            // Wide mode needs the default left padding so body clears the TOC rail.
            editPage && !wide && 'pl-2'
          )}
          data-resource-scroll
          ref={scrollContainerRef}
        >
          <div
            className={cn(
              'flex w-full min-w-0 max-w-full flex-col',
              resourcePaneColumnClassName({
                wide,
                useFullWidth,
                sidebarOpen: open,
                large,
              })
            )}
            style={!wide && useFullWidth ? { maxWidth: '100%' } : undefined}
          >
            <Wrapper
              {...currentResourceProps}
              error={error}
              showToc={!compactResourcePane}
              wide={wide}
            />
          </div>
        </div>
      </SidebarInset>
      <ConfirmDialog
        open={restoreOpen}
        title={t('resource.history.restore_title')}
        description={t('resource.history.restore_description')}
        confirmText={t('resource.history.restore_confirm')}
        cancelText={t('resource.history.restore_cancel')}
        loading={restoring}
        onOpenChange={setRestoreOpen}
        onConfirm={async () => {
          if (!selectedRevision) return;
          setRestoring(true);
          try {
            const { restoreResourceRevision } =
              await import('@/service/resource');
            const updated = await restoreResourceRevision(
              namespaceId,
              resourceId,
              selectedRevision.id
            );
            resourceProps.onResource(updated);
            resourceProps.app.fire('update_resource', updated);
            clearRevision(namespaceId, resourceId);
            setResourceRevisionQuery(null);
            setRestoreOpen(false);
          } catch {
            toast.error(t('resource.history.restore_failed'));
          } finally {
            setRestoring(false);
          }
        }}
      />
    </ResourceTasksProvider>
  );
}

export default function ResourceDetailView(props: ResourceDetailViewProps) {
  const commentsPanel = useResourceCommentsPanel();
  if (commentsPanel) {
    return <ResourceDetailContent {...props} />;
  }
  return (
    <ResourceCommentsProvider
      key={`${props.namespaceId}:${props.resourceId}`}
      namespaceId={props.namespaceId}
    >
      <ResourceDetailContent {...props} />
    </ResourceCommentsProvider>
  );
}
