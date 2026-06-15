import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/useApp';
import useConfig from '@/hooks/useConfig';
import useProNamespaces from '@/hooks/useProNamespaces';
import useSmartFolderEntitlements from '@/hooks/useSmartFolderEntitlements';
import { ResourceMeta, SpaceType } from '@/interface';
import { deleteResource } from '@/lib/deleteResource';
import { http } from '@/lib/request';
import {
  CreateSmartFolderRequest,
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
  isSmartFolderChildResource,
  SmartFolderOwnerScope,
  SmartFolderResponse,
  withSmartFolderChildSidebarAttrs,
} from '@/page/sidebar/components/smart-folder';
import { CreateSmartFolderDialog } from '@/page/sidebar/components/smart-folder/CreateSmartFolderDialog';
import { SmartFolderTrashConfirmDialog } from '@/page/sidebar/components/smart-folder/SmartFolderTrashConfirmDialog';
import { syncSmartFolderUpdate } from '@/page/sidebar/components/smart-folder/smartFolderUpdate';
import {
  fetchChildren,
  fetchRootResources,
  fetchSmartFolderChildren,
} from '@/service/resource';

import { BatchCreateDialog } from './components/BatchCreateDialog';
import BatchDeleteDialog from './components/BatchDeleteDialog';
import BatchMoveDialog from './components/BatchMoveDialog';
import ResourceTree from './components/resource-tree';
import { CreateFolderDialog } from './components/resource-tree/CreateFolderDialog';
import { Toolbar } from './components/toolbar';
import { useBatchOperations } from './hooks/useBatchOperations';
import { useSidebarEvents } from './hooks/useSidebarEvents';
import { useSidebarInit } from './hooks/useSidebarInit';
import { TreeNode, useSidebarStore } from './store';
import { getBatchSelectionSummary } from './store/utils';

interface IProps {
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
  const { namespaceId, resourceId } = props;
  const app = useApp();
  useSidebarInit({ namespaceId, resourceId });
  useSidebarEvents(namespaceId);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const [createSmartFolderOpen, setCreateSmartFolderOpen] = useState(false);
  const [refreshingResources, setRefreshingResources] = useState(false);
  const batch = useBatchOperations({ namespaceId });
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const { config, loading: configLoading } = useConfig();
  const { data: proNamespaces } = useProNamespaces({
    disabled: configLoading || !config.commercial,
  });
  const roots = useSidebarStore(state => state.rootIds);
  const nodes = useSidebarStore(state => state.nodes);
  const activeId = useSidebarStore(state => state.activeId);
  const currentUploadTargetId = useSidebarStore(
    s => s.dialogs.currentUploadTargetId
  );
  const createFolderTargetId = useSidebarStore(
    s => s.dialogs.createFolderTargetId
  );
  const editSmartFolderDialog = useSidebarStore(s => s.dialogs.editSmartFolder);
  const smartFolderTrashDialog = useSidebarStore(
    s => s.dialogs.smartFolderTrash
  );
  const privateRoot = roots.private ? nodes[roots.private] : undefined;
  const teamspaceRoot = roots.teamspace ? nodes[roots.teamspace] : undefined;
  const hasTeamspace = !!teamspaceRoot?.id;
  const currentNamespace = proNamespaces.find(item => item.id === namespaceId);
  const editSmartFolderNode = editSmartFolderDialog.nodeId
    ? nodes[editSmartFolderDialog.nodeId]
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
  const locateResourceId = activeId || resourceId;
  const canLocateCurrentResource =
    !!locateResourceId && locateResourceId !== 'chat';

  const handleLocateResource = () => {
    if (!canLocateCurrentResource) return;

    const targetId = useSidebarStore.getState().activeId || resourceId;
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

  const handleRefreshSidebarResources = async () => {
    if (refreshingResources) return;

    const state = useSidebarStore.getState();
    const rootIdSet = new Set(Object.values(state.rootIds).filter(Boolean));
    const expandedLoadedIds = Object.entries(state.ui)
      .filter(([id, ui]) => {
        const node = state.nodes[id];
        return (
          !!node &&
          ui.expanded &&
          ui.loaded &&
          (node.hasChildren ||
            node.resourceType === 'folder' ||
            node.resourceType === 'smart_folder') &&
          !rootIdSet.has(id)
        );
      })
      .map(([id]) => id);
    expandedLoadedIds.sort(
      (a, b) => getNodeDepth(state.nodes, a) - getNodeDepth(state.nodes, b)
    );
    const expandedIdSet = new Set(expandedLoadedIds);
    const locateSnapshot = getLocateSnapshot(
      state.nodes,
      state.activeId || resourceId
    );

    setRefreshingResources(true);
    try {
      const items = await fetchRootResources(namespaceId);
      const store = useSidebarStore.getState();
      store.init(items);

      for (const id of expandedLoadedIds) {
        const node = useSidebarStore.getState().nodes[id];
        if (!node) continue;

        const rawChildren =
          node.resourceType === 'smart_folder'
            ? await fetchSmartFolderChildren(namespaceId, id)
            : await fetchChildren(namespaceId, id);
        const children = rawChildren.map(child =>
          node.resourceType === 'smart_folder'
            ? withSmartFolderChildSidebarAttrs(child, id)
            : child
        );
        store.refreshChildren(id, children);
      }

      useSidebarStore.setState(draft => {
        const refreshedRootIdSet = new Set(
          Object.values(draft.rootIds).filter(Boolean)
        );
        Object.entries(draft.ui).forEach(([id, ui]) => {
          ui.expanded = refreshedRootIdSet.has(id) || expandedIdSet.has(id);
        });
      });

      if (locateSnapshot) {
        const targetId = locateSnapshot.smartFolderId || locateSnapshot.id;
        await useSidebarStore.getState().expandPathTo(targetId, {
          expandTarget: !!locateSnapshot.smartFolderId,
        });
        const refreshedStore = useSidebarStore.getState();
        const refreshedNode = refreshedStore.nodes[locateSnapshot.id];
        if (!refreshedNode) return;
        refreshedStore.toggleSpace(
          locateSnapshot.spaceType || refreshedNode.spaceType,
          true
        );
        refreshedStore.activate(locateSnapshot.id);
        scrollToResource(locateSnapshot.id);
      }
    } catch {
      // request.ts handles backend error toasts.
    } finally {
      setRefreshingResources(false);
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
            return fetchChildren(namespaceId, parentId).then(children => {
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
        navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
        window.setTimeout(() => {
          scrollToResource(id);
        }, 0);
        useSidebarStore.getState().refetchSmartFolderEntitlements();
        toast.success(t('smart_folder.create.success'));
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

        return fetchChildren(namespaceId, movedParentId).then(children => {
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
      useSidebarStore.getState().activate(id);
      navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
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
        entitlements={entitlements}
        hasTeamspace={hasTeamspace}
        smartFolderCounts={smartFolderCounts}
        onCreateSmartFolder={() => setCreateSmartFolderOpen(true)}
        onLocateResource={handleLocateResource}
        locateResourceDisabled={!canLocateCurrentResource}
        onRefreshResources={handleRefreshSidebarResources}
        refreshingResources={refreshingResources}
      />
      <ResourceTree
        namespaceId={namespaceId}
        hasTeamspace={hasTeamspace}
        currentNamespace={currentNamespace}
        onBatchDelete={batch.openDeleteDialog}
        onBatchMove={batch.openMoveDialog}
        onBatchCreate={batch.openCreateDialog}
        onAddToChat={batch.addSelectedToChat}
      />
      <CreateSmartFolderDialog
        open={createSmartFolderOpen}
        onOpenChange={setCreateSmartFolderOpen}
        onConfirm={handleConfirmCreateSmartFolder}
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
      <CreateFolderDialog
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
          try {
            const id = await store.create(
              createFolderTargetId,
              'folder',
              folderName
            );
            store.activate(id);
            store.closeCreateFolderDialog();
            navigate(`/${namespaceId}/${id}`, {
              state: { fromSidebar: true },
            });
          } catch {
            // request.ts handles backend error toasts.
          }
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
