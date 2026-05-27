import { useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { SidebarContent } from '@/components/ui/Sidebar';
import { useIsMobile } from '@/hooks/useMobile';
import { Namespace, SpaceType } from '@/interface';
import { SmartFolderEntitlements } from '@/page/sidebar/components/smart-folder';
import { useDragAutoScroll } from '@/page/sidebar/hooks/useDragAutoScroll';
import { TrashPanel } from '@/page/trash';

import SpaceSection from './SpaceSection';
import { useToolConfig } from './useToolConfig';

interface ResourceTreeProps {
  namespaceId: string;
  entitlements: SmartFolderEntitlements | undefined;
  hasTeamspace: boolean;
  currentNamespace: Namespace | undefined;
  smartFolderCounts: {
    privateCount: number;
    teamCount: number;
  };
  onCreateSmartFolder: () => void;
}

export default function ResourceTree({
  namespaceId,
  entitlements,
  hasTeamspace,
  currentNamespace,
  smartFolderCounts,
  onCreateSmartFolder,
}: ResourceTreeProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useDragAutoScroll(sidebarRef);

  const tools = useToolConfig({
    entitlements,
    counts: {
      ...smartFolderCounts,
      hasTeamspace,
    },
    onCreateSmartFolder,
  });

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="flex items-center justify-end">
        {tools.map(tool => {
          const ToolIcon = tool.icon;

          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={tool.disabled}
                    onClick={tool.onClick}
                    aria-label={tool.name}
                  >
                    <ToolIcon className="size-4 text-muted-foreground" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {tool.disabled && tool.disabledTip
                  ? tool.disabledTip
                  : tool.hoverTip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
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
