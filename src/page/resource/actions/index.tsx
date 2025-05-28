import Share from './share';
import i18next from 'i18next';
import { toast } from 'sonner';
import { useRef } from 'react';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import copy from 'copy-to-clipboard';
import { Resource } from '@/interface';
import { Input } from '@/components/input';
import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  ArrowUp,
  Copy,
  Link,
  MoreHorizontal,
  Pencil,
  PencilOff,
  Save,
  Trash2,
} from 'lucide-react';

interface IProps {
  app: App;
  forbidden: boolean;
  resource: Resource | null;
}

export const data = [
  [
    {
      id: 'copy_link',
      label: i18next.t('actions.copy_link'),
      icon: Link,
    },
    {
      id: 'duplicate',
      label: i18next.t('actions.duplicate'),
      icon: Copy,
    },
    {
      id: 'move_to_trash',
      label: i18next.t('actions.move_to_trash'),
      icon: Trash2,
    },
  ],
  [
    {
      id: 'import',
      label: i18next.t('actions.import'),
      icon: ArrowUp,
    },
  ],
];

export default function Actions(props: IProps) {
  const { app, forbidden, resource } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, onLoading] = useState('');
  const [editing, onEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const handleAction = (id: string) => {
    if (id === 'copy_link') {
      const returnValue = copy(location.href);
      toast(t(returnValue ? 'copy.success' : 'copy.fail'), {
        position: 'top-center',
      });
      setOpen(false);
      return;
    }
    if (!resource) {
      setOpen(false);
      return;
    }
    if (id === 'duplicate') {
      onLoading(id);
      http
        .post(
          `/namespaces/${resource.namespace.id}/resources/duplicate/${resource.id}`,
        )
        .then((response: Resource) => {
          setOpen(false);
          app.fire(
            'generate_resource',
            resource.space_type,
            resource.id,
            response,
          );
        })
        .finally(() => {
          onLoading('');
        });
      return;
    }
    if (id === 'move_to_trash') {
      onLoading(id);
      http
        .delete(`/namespaces/${resource.namespace.id}/resources/${resource.id}`)
        .then(() => {
          setOpen(false);
          app.fire(
            'delete_resource',
            resource.id,
            resource.space_type,
            resource.parent_id,
          );
        })
        .finally(() => {
          onLoading('');
        });
      return;
    }
    if (id === 'import') {
      fileInputRef.current?.click();
      return;
    }
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!resource || !e.target.files) {
      return;
    }
    onLoading('import');
    const formData = new FormData();
    formData.append('parent_id', resource.parent_id);
    formData.append('namespace_id', resource.namespace.id);
    formData.append('file', e.target.files[0]);
    http
      .post(`/namespaces/${resource.namespace.id}/resources/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        app.fire(
          'generate_resource',
          resource.space_type,
          resource.parent_id,
          response,
        );
      })
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
          position: 'top-center',
        });
      })
      .finally(() => {
        fileInputRef.current!.value = '';
        onLoading('');
        setOpen(false);
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
      <Popover open={open} onOpenChange={setOpen}>
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
          align="end"
          className="w-56 overflow-hidden rounded-lg p-0"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent className="gap-0">
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.map((item, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton
                            onClick={() => handleAction(item.id)}
                          >
                            {loading === item.id ? (
                              <LoaderCircle className="transition-transform animate-spin" />
                            ) : (
                              <item.icon />
                            )}
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleUpload}
              />
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
