import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Copy,
  CornerUpLeft,
  CornerUpRight,
  FileText,
  GalleryVerticalEnd,
  LineChart,
  Link,
  MoreHorizontal,
  Pencil,
  PencilOff,
  Save,
  Settings2,
  Trash,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { http } from '@/utils/request';
import { useGlobalContext } from '@/components/provider/global-context-provider';
import { useNavigate, useParams } from 'react-router-dom';
import { useResource } from '@/components/provider/resource-provider';
import type { Resource } from '@/types/resource.tsx';

export const data = [
  [
    {
      label: 'Customize Page',
      icon: Settings2,
    },
    {
      label: 'Turn into wiki',
      icon: FileText,
    },
  ],
  [
    {
      label: 'Copy Link',
      icon: Link,
    },
    {
      label: 'Duplicate',
      icon: Copy,
    },
    {
      label: 'Move to',
      icon: CornerUpRight,
    },
    {
      label: 'Move to Trash',
      icon: Trash2,
    },
  ],
  [
    {
      label: 'Undo',
      icon: CornerUpLeft,
    },
    {
      label: 'View analytics',
      icon: LineChart,
    },
    {
      label: 'Version History',
      icon: GalleryVerticalEnd,
    },
    {
      label: 'Show delete pages',
      icon: Trash,
    },
    {
      label: 'Notifications',
      icon: Bell,
    },
  ],
  [
    {
      label: 'Import',
      icon: ArrowUp,
    },
    {
      label: 'Export',
      icon: ArrowDown,
    },
  ],
];

export function NavResourceActions() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const { resourceId } = useParams();
  const { resource, setResource } = useResource();
  const globalContext = useGlobalContext();
  const vditor = globalContext.editorState.editor.vditor;
  const { setChild } = globalContext.resourceTreeViewState;

  const handleSave = () => {
    const content = vditor?.getValue();
    const name = globalContext.editorState.editor.title;
    if (content || name) {
      http
        .patch(`/resources/${resourceId}`, { content, name })
        .then((delta: Resource) => {
          setResource((prev) => ({ ...prev, ...delta }));
          // Update the resource in tree view
          const parentId = resource?.parentId;
          if (parentId) {
            setChild((prev) => {
              const parent = prev[parentId];
              const index = parent.findIndex((r) => r.id === resourceId);
              parent[index] = { ...parent[index], ...delta };
              return { ...prev, [parentId]: parent };
            });
          }
          navigate('.');
        });
    }
  };

  const timeDisplay = React.useMemo(() => {
    if (resource?.updatedAt) {
      return (
        'Updated ' +
        formatDistanceToNow(new Date(resource.updatedAt), { addSuffix: true })
      );
    }
    if (resource?.createdAt) {
      return (
        'Created ' +
        formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })
      );
    }
    return '';
  }, [resource?.updatedAt, resource?.createdAt]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        {timeDisplay}
      </div>
      <ThemeToggle />
      {vditor ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSave}
          >
            <Save />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate('.')}
          >
            <PencilOff />
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate('edit')}
          >
            <Pencil />
          </Button>
        </>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-[state=open]:bg-accent"
          >
            <MoreHorizontal />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 overflow-hidden rounded-lg p-0"
          align="end"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
