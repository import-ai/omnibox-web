import Share from './share';
import i18next from 'i18next';
import App from '@/hooks/app.class';
import { Resource } from '@/interface';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getTime } from '@/page/resource/utils';
import { ThemeToggle } from '@/page/resource/theme-toggle';
import PermissionWrapper from '@/components/permission-action/wrapper';
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
import i18n from '@/i18n';

interface IProps {
  app: App;
  forbidden: boolean;
  resource: Resource | null;
}

export const data = [
  [
    {
      label: i18next.t('actions.customize_page'),
      icon: Settings2,
    },
    {
      label: i18next.t('actions.turn_into_wiki'),
      icon: FileText,
    },
  ],
  [
    {
      label: i18next.t('actions.copy_link'),
      icon: Link,
    },
    {
      label: i18next.t('actions.duplicate'),
      icon: Copy,
    },
    {
      label: i18next.t('actions.move_to'),
      icon: CornerUpRight,
    },
    {
      label: i18next.t('actions.move_to_trash'),
      icon: Trash2,
    },
  ],
  [
    {
      label: i18next.t('actions.undo'),
      icon: CornerUpLeft,
    },
    {
      label: i18next.t('actions.view_analytics'),
      icon: LineChart,
    },
    {
      label: i18next.t('actions.version_history'),
      icon: GalleryVerticalEnd,
    },
    {
      label: i18next.t('actions.show_delete_pages'),
      icon: Trash,
    },
    {
      label: i18n.t('actions.notifications'),
      icon: Bell,
    },
  ],
  [
    {
      label: i18n.t('actions.import'),
      icon: ArrowUp,
    },
    {
      label: i18n.t('actions.export'),
      icon: ArrowDown,
    },
  ],
];

export default function Actions(props: IProps) {
  const { app, forbidden, resource } = props;
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
    app.fire('save', () => {
      onEditing(false);
    });
  };

  useEffect(() => {
    return app.on('to_edit', handleEdit);
  }, []);

  useEffect(() => {
    if (!resource) {
      return;
    }
    onEditing(false);
  }, [resource]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        {getTime(resource)}
      </div>
      <PermissionWrapper
        level={0}
        forbidden={forbidden}
        permission={
          resource && resource.current_level
            ? resource.current_level
            : 'full_access'
        }
      >
        <Share />
      </PermissionWrapper>
      <ThemeToggle />
      <PermissionWrapper
        level={1}
        forbidden={forbidden}
        permission={
          resource && resource.current_level
            ? resource.current_level
            : 'full_access'
        }
      >
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
      </PermissionWrapper>
      <Popover>
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
