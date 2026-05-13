import { useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { SmartFolderDefaultIcon } from '@/assets/icons/smartFolderDefault';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { SidebarContent } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import useConfig from '@/hooks/use-config';
import { useIsMobile } from '@/hooks/use-mobile';
import useProNamespaces from '@/hooks/use-pro-namespaces';
import useSmartFolderEntitlements from '@/hooks/use-smart-folder-entitlements';
import { SpaceType } from '@/interface';
import { http } from '@/lib/request';
import { CreateSmartFolderDialog } from '@/page/sidebar/content/create-smart-folder-dialog';
import {
  CreateSmartFolderRequest,
  SmartFolderEntitlements,
  SmartFolderOwnerScope,
  SmartFolderResponse,
} from '@/page/sidebar/content/smart-folder-types';
import { useDragAutoScroll } from '@/page/sidebar/hooks/use-drag-auto-scroll';
import { useSidebarStore } from '@/page/sidebar/store';
import { TrashPanel } from '@/page/trash';

import SpaceSection from './space-section';

interface ResourceTreeProps {
  namespaceId: string;
}

function getToolbarSmartFolderState(
  entitlements: SmartFolderEntitlements | undefined,
  counts: {
    privateCount: number;
    teamCount: number;
    hasTeamspace: boolean;
  }
) {
  if (!entitlements) {
    return {
      disabled: false,
      disabledMessageKey: 'actions.create_smart_folder',
    };
  }

  const privateLimit = entitlements.privateLimit ?? 1;
  const teamLimit = entitlements.teamLimit ?? 1;
  const privateExhausted =
    privateLimit >= 0 && counts.privateCount >= privateLimit;
  const teamExhausted = teamLimit >= 0 && counts.teamCount >= teamLimit;

  return {
    disabled: counts.hasTeamspace
      ? privateExhausted && teamExhausted
      : privateExhausted,
    disabledMessageKey: counts.hasTeamspace
      ? 'smart_folder.create.all_quota_exhausted'
      : 'smart_folder.create.quota_exhausted',
  };
}

export default function ResourceTree({ namespaceId }: ResourceTreeProps) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [createSmartFolderOpen, setCreateSmartFolderOpen] = useState(false);
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const { config, loading: configLoading } = useConfig();
  const { data: proNamespaces } = useProNamespaces({
    disabled: configLoading || !config.commercial,
  });
  const roots = useSidebarStore(state => state.rootIds);
  const nodes = useSidebarStore(state => state.nodes);

  useDragAutoScroll(sidebarRef);

  const privateRoot = roots.private ? nodes[roots.private] : undefined;
  const teamspaceRoot = roots.teamspace ? nodes[roots.teamspace] : undefined;
  const hasTeamspace = Boolean(teamspaceRoot?.id);
  const currentNamespace = proNamespaces.find(item => item.id === namespaceId);

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

  const toolbarSmartFolderState = getToolbarSmartFolderState(entitlements, {
    ...smartFolderCounts,
    hasTeamspace,
  });

  const handleConfirmCreateSmartFolder = (
    payload: CreateSmartFolderRequest
  ) => {
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
          store.activate(id);
          navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
          window.setTimeout(() => {
            app.fire('scroll_to_resource', id, response.resource.parent_id);
          }, 0);
          app.fire('smart_folder_entitlements_refetch');
          toast.success(t('smart_folder.create.success'));
        });
      });
  };

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="flex items-center justify-end px-2 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                disabled={toolbarSmartFolderState.disabled}
                onClick={() => setCreateSmartFolderOpen(true)}
                aria-label={t('actions.create_smart_folder')}
              >
                <SmartFolderDefaultIcon className="size-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {toolbarSmartFolderState.disabled
              ? t(toolbarSmartFolderState.disabledMessageKey)
              : t('actions.create_smart_folder')}
          </TooltipContent>
        </Tooltip>
      </div>
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
            .filter(Boolean)
            .map(node => ({
              id: node.id,
              name: node.name,
              parent_id: node.parentId,
              resource_type: node.resourceType,
              has_children: node.hasChildren,
              attrs: node.attrs,
            })),
          teamspace: teamspaceRoot?.children
            .map(childId => nodes[childId])
            .filter(Boolean)
            .map(node => ({
              id: node.id,
              name: node.name,
              parent_id: node.parentId,
              resource_type: node.resourceType,
              has_children: node.hasChildren,
              attrs: node.attrs,
            })),
        }}
      />
      <SidebarContent ref={sidebarRef} className="no-scrollbar gap-0">
        {(['private', 'teamspace'] as SpaceType[]).map(spaceType => (
          <SpaceSection
            key={spaceType}
            spaceType={spaceType}
            namespaceId={namespaceId}
            hasTeamspace={hasTeamspace}
            currentNamespace={currentNamespace}
          />
        ))}
        <TrashPanel />
      </SidebarContent>
    </DndProvider>
  );
}
