import { useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { SmartFolderDefaultIcon } from '@/assets/icons/smartFolderDefault';
import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { SidebarContent } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import useSmartFolderEntitlements from '@/hooks/use-smart-folder-entitlements';
import type { IResourceData, SpaceType } from '@/interface';
import group from '@/lib/group';
import { ISidebarProps } from '@/page/sidebar/interface';
import { TrashPanel } from '@/page/sidebar/trash';

import { CreateSmartFolderDialog } from './create-smart-folder-dialog';
import {
  CreateSmartFolderPayload,
  SmartFolderOwnerScope,
} from './smart-folder-types';
import Space from './space';
import { getToolbarSmartFolderState } from './space-menu';

// Auto-scroll trigger zone
const EDGE_SIZE = 60;
const MAX_SCROLL_SPEED = 600; // px per second

export interface IProps extends Omit<
  ISidebarProps,
  'spaceType' | 'data' | 'open'
> {
  data: {
    [index: string]: IResourceData;
  };
  openSpaces: Record<string, boolean>;
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
  onRename: (id: string, newName: string) => Promise<void>;
}

export default function Content(props: IProps) {
  const { data, resourceId, progress, onDrop, openSpaces, namespaceId } = props;
  const { t } = useTranslation();
  const loc = useLocation();
  const isMobile = useIsMobile();
  const [target, onTarget] = useState<IResourceData | null>(null);
  const [fileDragTarget, setFileDragTarget] = useState<string | null>(null);
  const [createSmartFolderOpen, setCreateSmartFolderOpen] = useState(false);
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarActiveKey =
    typeof loc.state?.sidebarActiveKey === 'string'
      ? loc.state.sidebarActiveKey
      : resourceId;
  const privateRoot = useMemo(() => group(data.private), [data]);
  const teamspaceRoot = useMemo(() => group(data.teamspace), [data]);
  const hasTeamspace = Boolean(data.teamspace?.id);
  const privateSmartFolderCount =
    privateRoot.children?.filter(item => item.resource_type === 'smart_folder')
      .length ?? 0;
  const teamSmartFolderCount =
    teamspaceRoot.children?.filter(
      item => item.resource_type === 'smart_folder'
    ).length ?? 0;
  const toolbarSmartFolderState = getToolbarSmartFolderState(entitlements, {
    privateCount: privateSmartFolderCount,
    teamCount: teamSmartFolderCount,
    hasTeamspace,
  });
  const handleDrop = (resource: IResourceData, item: IResourceData | null) => {
    onDrop(resource, item);
    onTarget(null);
  };
  const handleConfirmCreateSmartFolder = (
    payload: CreateSmartFolderPayload
  ) => {
    const ownerScope: SmartFolderOwnerScope = payload.ownerScope;
    const targetRoot = ownerScope === 'teamspace' ? teamspaceRoot : privateRoot;
    return props.onCreateSmartFolder(ownerScope, targetRoot.id, payload);
  };

  // Auto-scroll during drag: extends to sidebar header/footer and outside browser window
  useEffect(() => {
    const sidebarElement = sidebarRef.current;
    let scrollAnimId: number | null = null;
    let scrollStep = 0;
    let lastFrameTime = 0;
    let lastScrollDirection: number = 0; // -1 up, 0 none, 1 down
    let prevClientY: number | null = null;

    const stopAutoScroll = () => {
      if (scrollAnimId !== null) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
      }
      scrollStep = 0;
    };

    const tick = () => {
      if (!sidebarElement || scrollStep === 0) return;
      const now = performance.now();
      const dt = lastFrameTime
        ? Math.min((now - lastFrameTime) / 1000, 0.1)
        : 0;
      lastFrameTime = now;
      sidebarElement.scrollTop += scrollStep * MAX_SCROLL_SPEED * dt;
      scrollAnimId = requestAnimationFrame(tick);
    };

    const clear = () => {
      setFileDragTarget(null);
      onTarget(null);
    };
    const handleDragEnd = () => {
      clear();
      stopAutoScroll();
      lastScrollDirection = 0;
      prevClientY = null;
    };
    const handleDrop = () => {
      clear(); // In some environments, dragend may not trigger
      stopAutoScroll();
      lastScrollDirection = 0;
      prevClientY = null;
    };
    const handleWindowBlur = () => {
      clear();
      stopAutoScroll();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clear();
        stopAutoScroll();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!sidebarElement) return;
      const rect = sidebarElement.getBoundingClientRect();
      const clientY = e.clientY;

      const isAboveTop = clientY < rect.top + EDGE_SIZE;
      const isBelowBottom = clientY > rect.bottom - EDGE_SIZE;
      const isInsideRect = clientY >= rect.top && clientY <= rect.bottom;

      let nextScrollStep = 0;
      if (isAboveTop) nextScrollStep = -1;
      else if (isBelowBottom) nextScrollStep = 1;

      // When outside the sidebar content rect, only scroll if there is vertical movement
      if (nextScrollStep !== 0 && !isInsideRect) {
        if (prevClientY !== null && Math.abs(clientY - prevClientY) === 0) {
          // No vertical movement — keep scrolling if already active, but don't start
          if (scrollStep === 0) nextScrollStep = 0;
        }
      }

      if (nextScrollStep !== 0) {
        const changed = scrollStep !== nextScrollStep;
        scrollStep = nextScrollStep;
        lastScrollDirection = nextScrollStep;
        if (changed || scrollAnimId === null) {
          if (scrollAnimId !== null) cancelAnimationFrame(scrollAnimId);
          lastFrameTime = performance.now();
          scrollAnimId = requestAnimationFrame(tick);
        }
      } else {
        stopAutoScroll();
      }

      prevClientY = clientY;
    };

    const handleDragLeave = (e: DragEvent) => {
      // Cursor left the browser window — keep scrolling in last known direction
      if (!e.relatedTarget && lastScrollDirection !== 0 && scrollStep === 0) {
        scrollStep = lastScrollDirection;
        lastFrameTime = performance.now();
        scrollAnimId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAutoScroll();
    };
  }, []);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent ref={sidebarRef} className="gap-0 no-scrollbar">
        <div className="flex items-center justify-end px-2 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
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
          privateSmartFolderCount={privateSmartFolderCount}
          teamSmartFolderCount={teamSmartFolderCount}
          siblingResources={
            privateRoot.children?.concat(teamspaceRoot.children || []) ||
            teamspaceRoot.children ||
            []
          }
        />
        {Object.keys(data)
          .sort()
          .map((spaceType: string) => (
            <Space
              {...props}
              key={spaceType}
              target={target}
              progress={progress}
              onTarget={onTarget}
              onDrop={handleDrop}
              activeKey={sidebarActiveKey}
              data={group(data[spaceType])}
              spaceRoot={group(data[spaceType])}
              spaceType={spaceType as SpaceType}
              open={openSpaces[spaceType] !== false}
              fileDragTarget={fileDragTarget}
              onFileDragTarget={setFileDragTarget}
            />
          ))}
        <TrashPanel />
      </SidebarContent>
    </DndProvider>
  );
}
