import { getTime } from './utils';
import { useState } from 'react';
import useResource from '@/hooks/user-resource';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/page/resource/theme-toggle';
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

export default function Actions() {
  const { app, resource } = useResource();
  const [open, onOpen] = useState(false);
  const [editing, onEditing] = useState(false);
  const handleEdit = () => {
    onEditing(true);
    app.fire('resource_children', false);
  };
  const handleExitEdit = () => {
    onEditing(false);
    app.fire('resource_children', true);
  };
  const handleSave = () => {
    app.fire('save');
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        {getTime(resource)}
      </div>
      <ThemeToggle />
      {editing ? (
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
            onClick={handleExitEdit}
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
            onClick={handleEdit}
          >
            <Pencil />
          </Button>
        </>
      )}
      <Popover open={open} onOpenChange={onOpen}>
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
