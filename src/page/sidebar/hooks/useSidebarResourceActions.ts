import type { TFunction } from 'i18next';
import type { ChangeEvent, RefObject } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/useApp';
import type { ResourceMeta, SpaceType } from '@/interface';
import { deleteResource } from '@/lib/deleteResource';
import { http } from '@/lib/request';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import type {
  CreateRssFolderPayload,
  RssFolderResponse,
} from '@/page/sidebar/components/rss-folder';
import {
  CreateSmartFolderRequest,
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
  isSmartFolderChildResource,
  SmartFolderResponse,
} from '@/page/sidebar/components/smart-folder';
import { syncSmartFolderUpdate } from '@/page/sidebar/components/smart-folder/smartFolderUpdate';
import {
  fetchChildrenForSidebarRefresh,
  getExpandedNodeIdsForSidebarRefresh,
} from '@/page/sidebar/sidebarBehavior';
import { TreeNode, useSidebarStore } from '@/page/sidebar/store';
import { fetchChildren, fetchRootResources } from '@/service/resource';

interface LocateSnapshot {
  id: string;
  smartFolderId?: string;
  spaceType?: SpaceType;
}

interface ActionContext {
  app: ReturnType<typeof useApp>;
  namespaceId: string;
  navigate: ReturnType<typeof useNavigate>;
  t: TFunction;
}

function scrollToResource(resourceId: string) {
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-resource-id="${resourceId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
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

async function restoreExpandedResources(
  namespaceId: string,
  expandedIds: string[]
) {
  const store = useSidebarStore.getState();
  for (const id of expandedIds) {
    const node = useSidebarStore.getState().nodes[id];
    if (!node) continue;
    const children = await fetchChildrenForSidebarRefresh(namespaceId, node);
    if (children) store.refreshChildren(id, children);
  }
}

async function restoreLocatedResource(snapshot: LocateSnapshot | null) {
  if (!snapshot) return;
  const targetId = snapshot.smartFolderId || snapshot.id;
  await useSidebarStore.getState().expandPathTo(targetId, {
    expandTarget: !!snapshot.smartFolderId,
  });
  const store = useSidebarStore.getState();
  const node = store.nodes[snapshot.id];
  if (!node) return;
  store.toggleSpace(snapshot.spaceType || node.spaceType, true);
  store.activate(snapshot.id);
  scrollToResource(snapshot.id);
}

async function refreshSidebarResources(
  namespaceId: string,
  resourceId: string,
  app: ReturnType<typeof useApp>
) {
  const state = useSidebarStore.getState();
  const expandedIds = getExpandedNodeIdsForSidebarRefresh(
    state.nodes,
    state.ui,
    state.rootIds
  ).sort((a, b) => getNodeDepth(state.nodes, a) - getNodeDepth(state.nodes, b));
  const expandedIdSet = new Set(expandedIds);
  const snapshot = getLocateSnapshot(state.nodes, state.activeId || resourceId);

  useSidebarStore.getState().init(await fetchRootResources(namespaceId));
  await restoreExpandedResources(namespaceId, expandedIds);
  useSidebarStore.setState(draft => {
    const rootIds = new Set(Object.values(draft.rootIds).filter(Boolean));
    Object.entries(draft.ui).forEach(([id, ui]) => {
      ui.expanded = rootIds.has(id) || expandedIdSet.has(id);
    });
  });
  expandedIds.forEach(id => {
    if (useSidebarStore.getState().nodes[id]?.resourceType === 'rss_folder') {
      app.fire('refresh_rss_items', id);
    }
  });
  await restoreLocatedResource(snapshot);
}

async function restoreCreatedResource(
  context: ActionContext,
  resource: ResourceMeta,
  expandTarget = false
) {
  const store = useSidebarStore.getState();
  const id = await store.restore(resource);
  if (resource.parent_id) {
    store.refreshChildren(
      resource.parent_id,
      await fetchChildren(context.namespaceId, resource.parent_id)
    );
  }
  await store.expandPathTo(id, { expandTarget });
  store.activate(id);
  navigateToResource(context.navigate, `/${context.namespaceId}/${id}`, {
    state: { fromSidebar: true },
  });
  window.setTimeout(() => scrollToResource(id), 0);
}

async function createSmartFolder(
  context: ActionContext,
  payload: CreateSmartFolderRequest
) {
  const store = useSidebarStore.getState();
  const rootId = store.rootIds[payload.owner_scope];
  const response = await http.post<SmartFolderResponse>(
    `/namespaces/${context.namespaceId}/smart-folders`,
    { ...payload, parent_id: rootId }
  );
  await restoreCreatedResource(context, response.resource, true);
  useSidebarStore.getState().refetchSmartFolderEntitlements();
  toast.success(context.t('smart_folder.create.success'));
}

async function createRssFolder(
  context: ActionContext,
  payload: CreateRssFolderPayload,
  parentId?: string
) {
  const response = await http.post<RssFolderResponse>(
    `/namespaces/${context.namespaceId}/rss-folders`,
    { ...payload, parent_id: parentId },
    { muteCodes: ['rss_feed_invalid'] }
  );
  await restoreCreatedResource(context, response.resource);
  toast.success(context.t('rss_folder.create.success'));
}

async function updateRssFolder(
  context: ActionContext,
  payload: CreateRssFolderPayload
) {
  const nodeId = useSidebarStore.getState().dialogs.editRssFolder.nodeId;
  if (!nodeId) return Promise.reject();
  const response = await http.patch<RssFolderResponse>(
    `/namespaces/${context.namespaceId}/rss-folders/${nodeId}/config`,
    payload,
    { muteCodes: ['rss_feed_invalid'] }
  );
  useSidebarStore.getState().patch(nodeId, { name: response.resource.name });
  context.app.fire('update_resource', response.resource);
  toast.success(context.t('rss_folder.edit.success'));
}

async function updateSmartFolder(
  context: ActionContext,
  payload: CreateSmartFolderRequest
) {
  const state = useSidebarStore.getState();
  const nodeId = state.dialogs.editSmartFolder.nodeId;
  const node = nodeId ? state.nodes[nodeId] : undefined;
  if (!nodeId || !node) return Promise.reject();
  const response = await http.patch<SmartFolderResponse>(
    `/namespaces/${context.namespaceId}/smart-folders/${nodeId}/config`,
    payload
  );
  const { movedParentId } = syncSmartFolderUpdate({
    app: context.app,
    store: useSidebarStore.getState(),
    nodeId,
    nodeParentId: node.parentId,
    payload,
    response,
  });
  toast.success(context.t('smart_folder.edit.success'));
  if (!movedParentId) return;
  const store = useSidebarStore.getState();
  store.refreshChildren(
    movedParentId,
    await fetchChildren(context.namespaceId, movedParentId)
  );
  await store.expandPathTo(nodeId, { expandTarget: true });
  store.activate(nodeId);
  window.setTimeout(() => scrollToResource(nodeId), 0);
}

function deleteCurrentSmartFolder(context: ActionContext) {
  const state = useSidebarStore.getState();
  const nodeId = state.dialogs.smartFolderTrash.nodeId;
  const node = nodeId ? state.nodes[nodeId] : undefined;
  if (!nodeId) return;
  state.closeSmartFolderTrashDialog();
  deleteResource({
    id: nodeId,
    parentId: node?.parentId ?? null,
    namespaceId: context.namespaceId,
    app: context.app,
    resourceType: node?.resourceType,
  }).catch(() => {
    // request.ts handles backend error toasts.
  });
}

async function uploadFiles(
  context: ActionContext,
  files: FileList,
  targetId: string
) {
  const store = useSidebarStore.getState();
  const id = await store.uploadFiles(targetId, files);
  store.activate(id);
  navigateToResource(context.navigate, `/${context.namespaceId}/${id}`, {
    state: { fromSidebar: true },
  });
  toast.success(context.t('upload.success', { count: files.length }));
}

async function handleFileInputChange(
  context: ActionContext,
  inputRef: RefObject<HTMLInputElement>,
  event: ChangeEvent<HTMLInputElement>
) {
  const files = event.target.files;
  const targetId = useSidebarStore.getState().dialogs.currentUploadTargetId;
  if (!files || !targetId) return;
  try {
    await uploadFiles(context, files, targetId);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : context.t('upload.failed');
    toast(message, { position: 'bottom-right' });
  } finally {
    if (inputRef.current) inputRef.current.value = '';
  }
}

interface UseSidebarResourceActionsOptions {
  namespaceId: string;
  resourceId: string;
  rssFolderSpaceType: SpaceType;
}

export function useSidebarResourceActions({
  namespaceId,
  resourceId,
  rssFolderSpaceType,
}: UseSidebarResourceActionsOptions) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeId = useSidebarStore(state => state.activeId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const context = { app, namespaceId, navigate, t };
  const locateId = activeId || resourceId;

  return {
    canLocateCurrentResource: !!locateId && locateId !== 'chat',
    globalFileInputRef: inputRef,
    refreshingResources: refreshing,
    handleLocateResource: () => locateCurrentResource(resourceId, app),
    handleRefreshSidebarResources: async () => {
      if (refreshing) return;
      setRefreshing(true);
      try {
        await refreshSidebarResources(namespaceId, resourceId, app);
      } catch {
        // request.ts handles backend error toasts.
      } finally {
        setRefreshing(false);
      }
    },
    handleConfirmCreateSmartFolder: (payload: CreateSmartFolderRequest) =>
      createSmartFolder(context, payload),
    handleConfirmCreateRssFolder: (payload: CreateRssFolderPayload) => {
      const state = useSidebarStore.getState();
      return createRssFolder(
        context,
        payload,
        state.rootIds[rssFolderSpaceType]
      );
    },
    handleConfirmCreateRssFolderInNode: (payload: CreateRssFolderPayload) =>
      createRssFolder(
        context,
        payload,
        useSidebarStore.getState().dialogs.createRssFolderTargetId ?? undefined
      ),
    handleUpdateRssFolder: (payload: CreateRssFolderPayload) =>
      updateRssFolder(context, payload),
    handleUpdateSmartFolder: (payload: CreateSmartFolderRequest) =>
      updateSmartFolder(context, payload),
    handleConfirmSmartFolderDelete: () => deleteCurrentSmartFolder(context),
    navigateToCreatedResource: (id: string) =>
      navigateToResource(navigate, `/${namespaceId}/${id}`, {
        state: { fromSidebar: true },
      }),
    handleGlobalFileUpload: (event: ChangeEvent<HTMLInputElement>) =>
      handleFileInputChange(context, inputRef, event),
  };
}

function locateCurrentResource(
  fallbackResourceId: string,
  app: ReturnType<typeof useApp>
) {
  const store = useSidebarStore.getState();
  const targetId = store.activeId || fallbackResourceId;
  if (!targetId || targetId === 'chat') return;
  const node = store.nodes[targetId];
  const source = node
    ? { id: node.id, parent_id: node.parentId || '', attrs: node.attrs }
    : { id: targetId, parent_id: '' };
  app.fire(
    'scroll_to_resource',
    getSmartFolderSourceResourceId(source),
    node ? getSmartFolderSourceParentId(source) : undefined
  );
}
