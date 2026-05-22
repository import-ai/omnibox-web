import { useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { SidebarContent } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SpaceType } from '@/interface';
import { useDragAutoScroll } from '@/page/sidebar/hooks/use-drag-auto-scroll';
import { useSidebarStore } from '@/page/sidebar/store';
import { TrashPanel } from '@/page/trash';

import { menuIconClass } from './shared';
import SpaceSection from './space-section';
import { useToolConfig } from './tool.config';

interface ResourceTreeProps {
  namespaceId: string;
  resourceId: string;
}

export default function ResourceTree({
  namespaceId,
  resourceId,
}: ResourceTreeProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeId = useSidebarStore(s => s.activeId);
  const locationTargetId = resourceId || activeId || '';
  const toolConfig = useToolConfig({
    currentResourceId: locationTargetId,
    disabledMap: {
      'one-click-location': !locationTargetId,
    },
  });

  useDragAutoScroll(sidebarRef);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="flex items-center justify-end">
        {toolConfig.map(item => {
          const Icon = item.icon;
          const tooltip = item.disabled
            ? item.disabledTip || item.hoverTip
            : item.hoverTip;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={item.disabled}
                    onClick={item.onClick}
                    aria-label={item.name}
                  >
                    <Icon
                      className={
                        item.destructive
                          ? 'size-4 text-neutral-500 group-hover:text-destructive dark:text-[#a1a1a1]'
                          : menuIconClass
                      }
                    />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
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
          />
        ))}
        <TrashPanel />
      </SidebarContent>
    </DndProvider>
  );
}
