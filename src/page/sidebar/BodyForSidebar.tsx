import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FolderNameDialog } from '@/components/FolderNameDialog';
import { Input } from '@/components/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/useApp';
import useRssFolderLimits from '@/hooks/useRssFolderLimits';
import useSmartFolderEntitlements from '@/hooks/useSmartFolderEntitlements';
import { type Namespace, ResourceMeta, SpaceType } from '@/interface';
import { deleteResource } from '@/lib/deleteResource';
import { http } from '@/lib/request';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import type {
  CreateRssFolderPayload,
  RssFolderResponse,
} from '@/page/sidebar/components/rss-folder';
import { CreateRssFolderDialog } from '@/page/sidebar/components/rss-folder/CreateRssFolderDialog';
import {
  CreateSmartFolderRequest,
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
  isSmartFolderChildResource,
  SmartFolderOwnerScope,
  SmartFolderResponse,
} from '@/page/sidebar/components/smart-folder';
import { CreateSmartFolderDialog } from '@/page/sidebar/components/smart-folder/CreateSmartFolderDialog';
import { SmartFolderTrashConfirmDialog } from '@/page/sidebar/components/smart-folder/SmartFolderTrashConfirmDialog';
import { syncSmartFolderUpdate } from '@/page/sidebar/components/smart-folder/smartFolderUpdate';
import type { ResourceSortOptions } from '@/service/resource';
import { fetchChildren, initializeManualSort } from '@/service/resource';
import { updateResourceSortPreference } from '@/service/resourceSortPreference';

import { BatchCreateDialog } from './components/BatchCreateDialog';
import BatchDeleteDialog from './components/BatchDeleteDialog';
import BatchMoveDialog from './components/BatchMoveDialog';
import { ManualSortConfirmDialog } from './components/ManualSortConfirmDialog';
import ResourceTree from './components/resource-tree';
import { Toolbar } from './components/toolbar';
import { useBatchOperations } from './hooks/useBatchOperations';
import { useSidebarEvents } from './hooks/useSidebarEvents';
import { useSidebarInit } from './hooks/useSidebarInit';
import {
  countRssFoldersBySpace,
  getRssFolderQuotaExhausted,
} from './rssFolderQuota';
import {
  fetchChildrenForSidebarRefresh,
  getExpandedNodeIdsForSidebarRefresh,
} from './sidebarBehavior';
import { TreeNode, useSidebarStore } from './store';
import { getBatchSelectionSummary, getNodeResourceSort } from './store/utils';
import { locateSidebarResource, locateSidebarRssItem } from './utils';

interface IProps {
  currentNamespace?: Namespace;
  previewResourceId: string | null;
  resourceId: string;
  namespaceId: string;
}

interface LocateSnapshot {
  id: string;
  smartFolderId?: string;
  spaceType?: SpaceType;
}

function scrollToResource(resourceId: string) {
  requestAnimationFrame(() => {
    const element = document.querySelector(
      `[data-resource-id="${resourceId}"]`
    );
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function isTreeNode(node: TreeNode | undefined): node is TreeNode {
  return !!node;
}

function toResourceMeta(node: TreeNode): ResourceMeta {
  return {
    id: node.id,
    name: node.name,
    parent_id: node.parentId,
    resource_type: node.resourceType,
    has_children: node.hasChildren,
    attrs: node.attrs,
  };
}

function getSiblingResources(
  nodes: Record<string, TreeNode>,
  parentId?: string | null
): ResourceMeta[] {
  const parent = parentId ? nodes[parentId] : undefined;
  if (!parent) {
    return [];
  }

  return parent.children
    .map(childId => nodes[childId])
    .filter(isTreeNode)
    .map(toResourceMeta);
}

function getNodeDepth(nodes: Record<string, TreeNode>, id: string) {
  let depth = 0;
  let parentId = nodes[id]?.parentId;
  const visited = new Set<string>([id]);

  while (parentId && nodes[parentId] && !visited.has(parentId)) {
    depth += 1;
    visited.add(parentId);
    parentId = nodes[parentId].parentId;
  }

  return depth;
}

function getLocateSnapshot(
  nodes: Record<string, TreeNode>,
  id: string | null
): LocateSnapshot | null {
  if (!id || id === 'chat') return null;

  const node = nodes[id];
  if (!node) return { id };

  if (isSmartFolderChildResource(node)) {
    return {
      id,
      smartFolderId: node.parentId || undefined,
      spaceType: node.spaceType,
    };
  }

  return { id, spaceType: node.spaceType };
}

export function BodyForSidebar(props: IProps) {
  const { currentNamespace, namespaceId, previewResourceId, resourceId } =
    props;
  const app = useApp();
  useSidebarInit({ namespaceId, previewResourceId, resourceId });
  useSidebarEvents(namespaceId);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rss_item_id: rssItemId } = useParams();
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const [createSmartFolderOpen, setCreateSmartFolderOpen] = useState(false);
  const [defaultSmartFolderOwnerScope, setDefaultSmartFolderOwnerScope] =
    useState<SmartFolderOwnerScope | undefined>();
  const [createRssFolderOpen, setCreateRssFolderOpen] = useState(false);
  const [rssFolderSpaceType, setRssFolderSpaceType] =
    useState<SpaceType>('private');
  const [refreshingResources, setRefreshingResources] = useState(false);
  const [sortingSpace, setSortingSpace] = useState<SpaceType | null>(null);
  const batch = useBatchOperations({ namespaceId });
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const { data: rssFolderLimits } = useRssFolderLimits({ namespaceId });
  const roots = useSidebarStore(state => state.rootIds);
  const nodes = useSidebarStore(state => state.nodes);
  const activeId = useSidebarStore(state => state.activeId);
  const currentUploadTargetId = useSidebarStore(
    s => s.dialogs.currentUploadTargetId
  );
  const createFolderTargetId = useSidebarStore(
    s => s.dialogs.createFolderTargetId
  );
  const createRssFolderTargetId = useSidebarStore(
    s => s.dialogs.createRssFolderTargetId
  );
  const editSmartFolderDialog = useSidebarStore(s => s.dialogs.editSmartFolder);
  const editRssFolderDialog = useSidebarStore(s => s.dialogs.editRssFolder);
  const smartFolderTrashDialog = useSidebarStore(
    s => s.dialogs.smartFolderTrash
  );
  const pendingManualDrop = useSidebarStore(s => s.dialogs.pendingManualDrop);
  const pendingManualTarget = pendingManualDrop
    ? nodes[pendingManualDrop.targetId]
    : undefined;
  const pendingManualSpace = pendingManualTarget?.spaceType;
  const pendingManualRoot = pendingManualSpace
    ? nodes[roots[pendingManualSpace]]
    : undefined;
  const pendingManualRecordExists = Boolean(
    pendingManualRoot?.manualSortInitializedAt
  );
  const privateRoot = roots.private ? nodes[roots.private] : undefined;
  const teamspaceRoot = roots.teamspace ? nodes[roots.teamspace] : undefined;
  const hasTeamspace = !!teamspaceRoot?.id;
  const editSmartFolderNode = editSmartFolderDialog.nodeId
    ? nodes[editSmartFolderDialog.nodeId]
    : undefined;
  const editRssFolderNode = editRssFolderDialog.nodeId
    ? nodes[editRssFolderDialog.nodeId]
    : undefined;

  const smartFolderCounts = useMemo(() => {
    const countRootSmartFolders = (rootId: string) => {
      const root = nodes[rootId];
      if (!root) return 0;
      return root.children.filter(
        childId => nodes[childId]?.resourceType === 'smart_folder'
      ).length;
    };

    return {
      privateCount:
        entitlements?.privateUsed ?? countRootSmartFolders(roots.private),
      teamCount:
        entitlements?.teamUsed ?? countRootSmartFolders(roots.teamspace),
    };
  }, [
    entitlements?.privateUsed,
    entitlements?.teamUsed,
    nodes,
    roots.private,
    roots.teamspace,
  ]);
  const batchSelection = useMemo(
    () => getBatchSelectionSummary(nodes, batch.selectedIds),
    [batch.selectedIds, nodes]
  );
  const locateResourceId = previewResourceId || activeId || resourceId;
  const canLocateCurrentResource =
    !!locateResourceId && locateResourceId !== 'chat';
  const smartFolderQuotaExhausted = useMemo(() => {
    const privateLimit = entitlements?.privateLimit ?? 1;
    const teamLimit = entitlements?.teamLimit ?? 1;

    return {
      private:
        !!entitlements &&
        privateLimit >= 0 &&
        smartFolderCounts.privateCount >= privateLimit,
      teamspace:
        !!entitlements &&
        teamLimit >= 0 &&
        smartFolderCounts.teamCount >= teamLimit,
    };
  }, [
    entitlements,
    smartFolderCounts.privateCount,
    smartFolderCounts.teamCount,
  ]);
  const rssFolderLocalCounts = useMemo(
    () => countRssFoldersBySpace(nodes),
    [nodes]
  );
  const rssFolderQuotaExhausted = useMemo(
    () => getRssFolderQuotaExhausted(rssFolderLimits, rssFolderLocalCounts),
    [rssFolderLimits, rssFolderLocalCounts]
  );

  const handleCreateSmartFolder = (ownerScope: SmartFolderOwnerScope) => {
    setDefaultSmartFolderOwnerScope(ownerScope);
    setCreateSmartFolderOpen(true);
  };

  const handleCreateRssFolder = (spaceType: SpaceType) => {
    setRssFolderSpaceType(spaceType);
    setCreateRssFolderOpen(true);
  };

  const handleLocateResource = () => {
    if (!canLocateCurrentResource) return;

    // RSS item pages keep resourceId as the folder id. Locate the history row
    // itself instead of only scrolling to the folder node.
    if (rssItemId && resourceId) {
      void locateSidebarRssItem(resourceId, rssItemId);
      return;
    }

    const targetId =
      previewResourceId || useSidebarStore.getState().activeId || resourceId;
    if (!targetId || targetId === 'chat') return;

    const store = useSidebarStore.getState();
    const node = store.nodes[targetId];
    const sourceResourceId = node
      ? getSmartFolderSourceResourceId({
          id: node.id,
          parent_id: node.parentId || '',
          attrs: node.attrs,
        })
      : targetId;
    const sourceParentId = node
      ? getSmartFolderSourceParentId({
          id: node.id,
          parent_id: node.parentId || '',
          attrs: node.attrs,
        })
      : undefined;

    app.fire('scroll_to_resource', sourceResourceId, sourceParentId);
  };

  const refreshSpaceResources = async (
    spaceType: SpaceType,
    sort: ResourceSortOptions = useSidebarStore.getState().resourceSorts[
      spaceType
    ]
  ) => {
    const state = useSidebarStore.getState();
    const rootId = state.rootIds[spaceType];
    if (!rootId) return;

    const expandedIds = getExpandedNodeIdsForSidebarRefresh(
      state.nodes,
      state.ui,
      state.rootIds
    ).filter(id => state.nodes[id]?.spaceType === spaceType);
    expandedIds.sort(
      (a, b) => getNodeDepth(state.nodes, a) - getNodeDepth(state.nodes, b)
    );
    const store = useSidebarStore.getState();
    const rootChildren = await fetchChildren(namespaceId, rootId, sort);
    store.refreshChildren(rootId, rootChildren);

    for (const id of expandedIds) {
      const node = useSidebarStore.getState().nodes[id];
      if (!node) continue;

      const children = await fetchChildrenForSidebarRefresh(
        namespaceId,
        node,
        sort
      );
      if (!children) {
        app.fire('refresh_rss_items', id);
        continue;
      }
      store.refreshChildren(id, children);
    }
  };

  const handleRefreshSidebarResources = async () => {
    if (refreshingResources) return;

    const state = useSidebarStore.getState();

    const locateSnapshot = getLocateSnapshot(
      state.nodes,
      previewResourceId || state.activeId || resourceId
    );

    setRefreshingResources(true);
    try {
      await Promise.all(
        (['private', 'teamspace'] as SpaceType[]).map(spaceType =>
          refreshSpaceResources(spaceType)
        )
      );

      // Expand/activate first so collapsed folders recover. History rows may
      // also remount via refresh_rss_items and re-locate through auto-scroll.
      if (rssItemId && resourceId) {
        await locateSidebarRssItem(resourceId, rssItemId);
      } else if (locateSnapshot) {
        await locateSidebarResource(locateSnapshot.id);
      }
    } catch {
      // request.ts handles backend error toasts.
    } finally {
      setRefreshingResources(false);
    }
  };

  const handleResourceSortChange = async (
    spaceType: SpaceType,
    sort: ResourceSortOptions
  ) => {
    if (sortingSpace) return;
    const store = useSidebarStore.getState();
    const sourceSort = store.resourceSorts[spaceType];
    const rootId = store.rootIds[spaceType];
    if (!rootId) return;
    const locateSnapshot = getLocateSnapshot(
      store.nodes,
      previewResourceId || store.activeId || resourceId
    );

    store.setResourceSort(spaceType, sort);
    setSortingSpace(spaceType);
    try {
      if (sort.sort_by === 'manual') {
        const result = await initializeManualSort(
          namespaceId,
          rootId,
          sourceSort
        );
        store.patch(rootId, {
          manualSortInitializedAt: result.initialized_at,
        });
      }
      await updateResourceSortPreference(namespaceId, spaceType, sort);
      await refreshSpaceResources(spaceType, sort);
      if (rssItemId && resourceId) {
        await locateSidebarRssItem(resourceId, rssItemId);
      } else if (locateSnapshot) {
        await locateSidebarResource(locateSnapshot.id);
      }
    } catch {
      store.setResourceSort(spaceType, sourceSort);
      // request.ts handles backend error toasts.
    } finally {
      setSortingSpace(null);
    }
  };

  const handleConfirmManualSort = async (overwrite = true) => {
    const store = useSidebarStore.getState();
    const pending = store.dialogs.pendingManualDrop;
    if (!pending) return;

    const targetNode = store.nodes[pending.targetId];
    const spaceType = targetNode?.spaceType;
    if (!spaceType) return;
    const rootId = store.rootIds[spaceType];
    const sourceSort = store.resourceSorts[spaceType];
    if (!rootId) return;

    setSortingSpace(spaceType);
    try {
      const result = await initializeManualSort(
        namespaceId,
        rootId,
        sourceSort,
        overwrite
      );
      store.patch(rootId, {
        manualSortInitializedAt: result.initialized_at,
      });
      const manualSort = { sort_by: 'manual', sort_order: 'asc' } as const;
      store.setResourceSort(spaceType, manualSort);
      await updateResourceSortPreference(namespaceId, spaceType, manualSort);
      await refreshSpaceResources(spaceType, manualSort);
      await useSidebarStore.getState().applyManualDrop(pending, () => {
        toast.error(t('sidebar.sort.sync_failed'), {
          position: 'bottom-right',
        });
      });
      useSidebarStore.getState().setPendingManualDrop(null);
    } catch {
      // request.ts handles backend error toasts.
    } finally {
      setSortingSpace(null);
    }
  };

  const handleConfirmCreateSmartFolder = (
    payload: CreateSmartFolderRequest
  ): Promise<void> => {
    const ownerScope: SmartFolderOwnerScope = payload.owner_scope;
    const targetRoot = ownerScope === 'teamspace' ? teamspaceRoot : privateRoot;

    return http
      .post<SmartFolderResponse>(`/namespaces/${namespaceId}/smart-folders`, {
        ...payload,
        parent_id: targetRoot?.id,
      })
      .then(response => {
        const store = useSidebarStore.getState();
        return store.restore(response.resource).then(id => {
          const parentId = response.resource.parent_id;
          if (parentId) {
            return fetchChildren(
              namespaceId,
              parentId,
              getNodeResourceSort(useSidebarStore.getState(), parentId)
            ).then(children => {
              store.refreshChildren(parentId, children);
              return store
                .expandPathTo(id, { expandTarget: true })
                .then(() => id);
            });
          }
          return store.expandPathTo(id, { expandTarget: true }).then(() => id);
        });
      })
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigateToResource(navigate, `/${namespaceId}/${id}`, {
          state: { fromSidebar: true },
        });
        window.setTimeout(() => {
          scrollToResource(id);
        }, 0);
        useSidebarStore.getState().refetchSmartFolderEntitlements();
        toast.success(t('smart_folder.create.success'));
      });
  };

  const createRssFolderAt = (
    payload: CreateRssFolderPayload,
    parentId: string | undefined
  ): Promise<void> => {
    return http
      .post<RssFolderResponse>(
        `/namespaces/${namespaceId}/rss-folders`,
        {
          ...payload,
          parent_id: parentId,
        },
        { muteCodes: ['rss_feed_invalid'] }
      )
      .then((response: RssFolderResponse) => {
        const store = useSidebarStore.getState();
        return store.restore(response.resource).then(id => {
          const parentId = response.resource.parent_id;
          if (parentId) {
            return fetchChildren(
              namespaceId,
              parentId,
              getNodeResourceSort(useSidebarStore.getState(), parentId)
            ).then(children => {
              store.refreshChildren(parentId, children);
              return store.expandPathTo(id).then(() => id);
            });
          }
          return store.expandPathTo(id).then(() => id);
        });
      })
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigateToResource(navigate, `/${namespaceId}/${id}`, {
          state: { fromSidebar: true },
        });
        window.setTimeout(() => {
          scrollToResource(id);
        }, 0);
        useSidebarStore.getState().refetchRssFolderLimits();
        toast.success(t('rss_folder.create.success'));
      });
  };

  const handleConfirmCreateRssFolder = (
    payload: CreateRssFolderPayload
  ): Promise<void> => {
    const targetRoot =
      rssFolderSpaceType === 'teamspace' ? teamspaceRoot : privateRoot;

    return createRssFolderAt(payload, targetRoot?.id);
  };

  const handleConfirmCreateRssFolderInNode = (
    payload: CreateRssFolderPayload
  ): Promise<void> => {
    return createRssFolderAt(payload, createRssFolderTargetId ?? undefined);
  };

  const handleUpdateRssFolder = (
    payload: CreateRssFolderPayload
  ): Promise<void> => {
    const nodeId = editRssFolderDialog.nodeId;
    if (!nodeId) {
      return Promise.reject();
    }

    return http
      .patch(
        `/namespaces/${namespaceId}/rss-folders/${nodeId}/config`,
        payload,
        {
          muteCodes: ['rss_feed_invalid'],
        }
      )
      .then((response: RssFolderResponse) => {
        const store = useSidebarStore.getState();
        store.patch(nodeId, { name: response.resource.name });
        app.fire('update_resource', response.resource);
        toast.success(t('rss_folder.edit.success'));
      });
  };

  const handleUpdateSmartFolder = (
    payload: CreateSmartFolderRequest
  ): Promise<void> => {
    const nodeId = editSmartFolderDialog.nodeId;
    const node = nodeId ? nodes[nodeId] : undefined;
    if (!nodeId || !node) {
      return Promise.reject();
    }

    return http
      .patch(
        `/namespaces/${namespaceId}/smart-folders/${nodeId}/config`,
        payload
      )
      .then((response: SmartFolderResponse) => {
        const store = useSidebarStore.getState();
        const { movedParentId } = syncSmartFolderUpdate({
          app,
          store,
          nodeId,
          nodeParentId: node.parentId,
          payload,
          response,
        });
        toast.success(t('smart_folder.edit.success'));

        if (!movedParentId) {
          return;
        }

        return fetchChildren(
          namespaceId,
          movedParentId,
          getNodeResourceSort(useSidebarStore.getState(), movedParentId)
        ).then(children => {
          store.refreshChildren(movedParentId, children);
          return store.expandPathTo(nodeId, { expandTarget: true }).then(() => {
            store.activate(nodeId);
            window.setTimeout(() => {
              scrollToResource(nodeId);
            }, 0);
          });
        });
      });
  };

  const handleConfirmSmartFolderDelete = () => {
    const nodeId = smartFolderTrashDialog.nodeId;
    const node = nodeId ? nodes[nodeId] : undefined;
    if (!nodeId) {
      return;
    }

    useSidebarStore.getState().closeSmartFolderTrashDialog();
    deleteResource({
      id: nodeId,
      parentId: node?.parentId ?? null,
      namespaceId,
      app,
      resourceType: node?.resourceType,
    }).catch(() => {
      // request.ts handles backend error toasts.
    });
  };

  const handleGlobalFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || !currentUploadTargetId) return;

    try {
      const id = await useSidebarStore
        .getState()
        .uploadFiles(currentUploadTargetId, files);
      navigateToResource(navigate, `/${namespaceId}/${id}`, {
        state: { fromSidebar: true },
      });
      await locateSidebarResource(id);
      toast.success(t('upload.success', { count: files.length }));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : t('upload.failed');
      toast(message, { position: 'bottom-right' });
    } finally {
      if (globalFileInputRef.current) {
        globalFileInputRef.current.value = '';
      }
    }
  };

  return (
    <React.Fragment>
      <Toolbar
        selectionMode={batch.selectionMode}
        onDeselectAll={batch.deselectAll}
        onBatchDelete={batch.openDeleteDialog}
        onBatchMove={batch.openMoveDialog}
        onBatchCreate={batch.openCreateDialog}
        onAddToChat={batch.addSelectedToChat}
        toggleSelectionMode={batch.toggleSelectionMode}
        onLocateResource={handleLocateResource}
        locateResourceDisabled={!canLocateCurrentResource}
        onRefreshResources={handleRefreshSidebarResources}
        refreshingResources={refreshingResources || !!sortingSpace}
      />
      <ResourceTree
        namespaceId={namespaceId}
        hasTeamspace={hasTeamspace}
        currentNamespace={currentNamespace}
        onBatchDelete={batch.openDeleteDialog}
        onBatchMove={batch.openMoveDialog}
        onBatchCreate={batch.openCreateDialog}
        onAddToChat={batch.addSelectedToChat}
        onCreateSmartFolder={handleCreateSmartFolder}
        onCreateRssFolder={handleCreateRssFolder}
        smartFolderQuotaExhausted={smartFolderQuotaExhausted}
        rssFolderQuotaExhausted={rssFolderQuotaExhausted}
        sortingSpace={sortingSpace}
        onResourceSortChange={handleResourceSortChange}
      />
      <ManualSortConfirmDialog
        open={!!pendingManualDrop}
        loading={!!sortingSpace}
        hasExistingManualSort={pendingManualRecordExists}
        onCancel={() => useSidebarStore.getState().setPendingManualDrop(null)}
        onConfirm={() => handleConfirmManualSort(pendingManualRecordExists)}
        spaceName={
          pendingManualSpace === 'teamspace'
            ? t('sidebar.sort.teamspace')
            : t('sidebar.sort.private')
        }
      />
      <CreateSmartFolderDialog
        open={createSmartFolderOpen}
        onOpenChange={open => {
          setCreateSmartFolderOpen(open);
          if (!open) {
            setDefaultSmartFolderOwnerScope(undefined);
          }
        }}
        onConfirm={handleConfirmCreateSmartFolder}
        defaultOwnerScope={defaultSmartFolderOwnerScope}
        hasTeamspace={hasTeamspace}
        currentNamespace={currentNamespace}
        privateSmartFolderCount={smartFolderCounts.privateCount}
        teamSmartFolderCount={smartFolderCounts.teamCount}
        siblingResourcesByScope={{
          private: privateRoot?.children
            .map(childId => nodes[childId])
            .filter(isTreeNode)
            .map(toResourceMeta),
          teamspace: teamspaceRoot?.children
            .map(childId => nodes[childId])
            .filter(isTreeNode)
            .map(toResourceMeta),
        }}
      />
      <CreateSmartFolderDialog
        open={editSmartFolderDialog.open}
        currentResourceId={editSmartFolderDialog.nodeId || undefined}
        initialValue={editSmartFolderDialog.initialValue}
        title={t('smart_folder.edit.title')}
        confirmText={t('smart_folder.edit.submit')}
        hasTeamspace={hasTeamspace}
        currentNamespace={currentNamespace}
        siblingResources={getSiblingResources(
          nodes,
          editSmartFolderNode?.parentId
        )}
        onOpenChange={open => {
          if (!open) {
            useSidebarStore.getState().closeEditSmartFolderDialog();
          }
        }}
        onConfirm={handleUpdateSmartFolder}
      />
      <CreateRssFolderDialog
        open={createRssFolderOpen}
        onOpenChange={setCreateRssFolderOpen}
        onConfirm={handleConfirmCreateRssFolder}
        currentNamespace={currentNamespace}
        siblingResources={getSiblingResources(
          nodes,
          rssFolderSpaceType === 'teamspace'
            ? teamspaceRoot?.id
            : privateRoot?.id
        )}
      />
      <CreateRssFolderDialog
        open={!!createRssFolderTargetId}
        onOpenChange={open => {
          if (!open) {
            useSidebarStore.getState().closeCreateRssFolderDialog();
          }
        }}
        onConfirm={handleConfirmCreateRssFolderInNode}
        currentNamespace={currentNamespace}
        siblingResources={getSiblingResources(
          nodes,
          createRssFolderTargetId ?? undefined
        )}
      />
      <CreateRssFolderDialog
        open={editRssFolderDialog.open}
        currentResourceId={editRssFolderDialog.nodeId || undefined}
        initialValue={editRssFolderDialog.initialValue}
        title={t('rss_folder.edit.title')}
        confirmText={t('rss_folder.edit.submit')}
        currentNamespace={currentNamespace}
        siblingResources={getSiblingResources(
          nodes,
          editRssFolderNode?.parentId
        )}
        onOpenChange={open => {
          if (!open) {
            useSidebarStore.getState().closeEditRssFolderDialog();
          }
        }}
        onConfirm={handleUpdateRssFolder}
      />
      <SmartFolderTrashConfirmDialog
        open={smartFolderTrashDialog.open}
        retentionDays={entitlements?.trashRetentionDays}
        onOpenChange={open => {
          if (!open) {
            useSidebarStore.getState().closeSmartFolderTrashDialog();
          }
        }}
        onConfirm={handleConfirmSmartFolderDelete}
      />
      <FolderNameDialog
        open={!!createFolderTargetId}
        onOpenChange={open => {
          if (!open) {
            useSidebarStore.getState().closeCreateFolderDialog();
          }
        }}
        onConfirm={async folderName => {
          if (!createFolderTargetId) {
            return;
          }
          const store = useSidebarStore.getState();
          const id = await store.create(
            createFolderTargetId,
            'folder',
            folderName
          );
          store.activate(id);
          store.closeCreateFolderDialog();
          navigateToResource(navigate, `/${namespaceId}/${id}`, {
            state: { fromSidebar: true },
          });
          await locateSidebarResource(id);
        }}
      />
      <BatchCreateDialog
        open={batch.createDialogOpen}
        namespaceId={namespaceId}
        defaultTargetId={batch.defaultTargetId}
        selectedIds={batch.selectedIds}
        onOpenChange={open => {
          if (!open) {
            batch.closeCreateDialog();
          }
        }}
        onConfirm={batch.confirmCreate}
      />
      <BatchDeleteDialog
        open={batch.deleteDialogOpen}
        selection={batchSelection}
        namespaceId={namespaceId}
        loading={batch.isProcessing}
        onConfirm={batch.confirmDelete}
        onCancel={batch.closeDeleteDialog}
      />
      <BatchMoveDialog
        open={batch.moveDialogOpen}
        selectedIds={batch.selectedIds}
        selectedCount={batch.selectedCount}
        namespaceId={namespaceId}
        loading={batch.isProcessing}
        onConfirm={batch.confirmMove}
        onCancel={batch.closeMoveDialog}
      />
      <Input
        multiple
        type="file"
        className="hidden"
        ref={globalFileInputRef}
        id="global-sidebar-file-input"
        accept={ALLOW_FILE_EXTENSIONS}
        onChange={handleGlobalFileUpload}
      />
    </React.Fragment>
  );
}
