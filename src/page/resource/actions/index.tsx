import Share from './share';
import { toast } from 'sonner';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import copy from 'copy-to-clipboard';
import { Resource } from '@/interface';
import { Input } from '@/components/input';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { getTime } from '@/page/resource/utils';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useEffect, useRef, useState } from 'react';
import { LanguageToggle } from '@/i18n/language-toggle';
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
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Save,
  Copy,
  Link,
  Trash2,
  Pencil,
  ArrowUp,
  PencilOff,
  MoveHorizontal,
  LoaderCircle,
  MoreHorizontal,
} from 'lucide-react';

interface IProps {
  app: App;
  wide: boolean;
  onWide: (wide: boolean) => void;
  forbidden: boolean;
  resource: Resource | null;
}

export default function Actions(props: IProps) {
  const { app, wide, onWide, forbidden, resource } = props;
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
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
    if (id === 'wide') {
      onWide(!wide);
      return;
    }
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
          toast(t('resource.deleted'), {
            description: t('resource.deleted_description'),
            action: {
              label: t('undo'),
              onClick: () => {
                http
                  .post(
                    `/namespaces/${resource.namespace.id}/resources/${resource.id}/restore`,
                  )
                  .then((response) => {
                    app.fire(
                      'generate_resource',
                      response.space_type,
                      response.parent_id,
                      response,
                    );
                  });
              },
            },
          });
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
      {resource && resource.space_type !== 'private' && (
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
      )}
      <LanguageToggle />
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
              <SidebarGroup className="border-b">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleAction('copy_link')}
                      >
                        {loading === 'copy_link' ? (
                          <LoaderCircle className="transition-transform animate-spin" />
                        ) : (
                          <Link />
                        )}
                        <span>{t('actions.copy_link')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleAction('duplicate')}
                      >
                        {loading === 'duplicate' ? (
                          <LoaderCircle className="transition-transform animate-spin" />
                        ) : (
                          <Copy />
                        )}
                        <span>{t('actions.duplicate')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleAction('move_to_trash')}
                      >
                        {loading === 'move_to_trash' ? (
                          <LoaderCircle className="transition-transform animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                        <span>{t('actions.move_to_trash')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {!isMobile && (
                <SidebarGroup className="border-b">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleAction('wide')}
                          className="flex items-center justify-between"
                        >
                          <div className="flex gap-2 items-center">
                            {loading === 'wide' ? (
                              <LoaderCircle className="transition-transform animate-spin" />
                            ) : (
                              <MoveHorizontal className="size-4" />
                            )}
                            <span>{t('actions.wide')}</span>
                          </div>
                          <Switch checked={wide} />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              <SidebarGroup className="border-b">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => handleAction('import')}>
                        {loading === 'import' ? (
                          <LoaderCircle className="transition-transform animate-spin" />
                        ) : (
                          <ArrowUp />
                        )}
                        <span>{t('actions.import')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleUpload}
                accept={ALLOW_FILE_EXTENSIONS}
              />
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
