import Share from './share';
import MoveTo from './move';
import { toast } from 'sonner';
import { http } from '@/lib/request';
import copy from 'copy-to-clipboard';
// import { Resource } from '@/interface';
import { useRef, useState } from 'react';
import { Input } from '@/components/input';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { getTime } from '@/page/resource/utils';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useIsMobile } from '@/hooks/use-mobile';
import { uploadFiles } from '@/lib/upload-files';
import { IUseResource } from '@/hooks/user-resource';
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
  Save,
  Copy,
  Link,
  Files,
  Trash2,
  Pencil,
  ArrowUp,
  CornerUpRight,
  PencilOff,
  MoveHorizontal,
  LoaderCircle,
  MoreHorizontal,
} from 'lucide-react';

export interface IActionProps extends IUseResource {
  wide: boolean;
  onWide: (wide: boolean) => void;
}

export default function Actions(props: IActionProps) {
  const { app, wide, onWide, forbidden, resource, editPage, namespaceId } =
    props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [loading, onLoading] = useState('');
  const [moveTo, setMoveTo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleEdit = () => {
    if (!resource) {
      return;
    }
    navigate(`/${namespaceId}/${resource.id}/edit`);
  };
  const handleExitEdit = () => {
    if (!resource) {
      return;
    }
    navigate(`/${namespaceId}/${resource.id}`);
  };
  const handleSave = () => {
    app.fire('save', () => {
      if (!resource) {
        return;
      }
      navigate(`/${namespaceId}/${resource.id}`);
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
        position: 'bottom-right',
      });
      setOpen(false);
      return;
    }
    if (!resource) {
      setOpen(false);
      return;
    }
    if (id === 'copy_content' && resource.content) {
      const returnValue = copy(resource.content, {
        format: 'text/plain',
      });
      toast(t(returnValue ? 'copy.success' : 'copy.fail'), {
        position: 'bottom-right',
      });
      setOpen(false);
      return;
    }
    if (id === 'duplicate') {
      onLoading(id);
      http
        .post(`/namespaces/${namespaceId}/resources/${resource.id}/duplicate`)
        .then(response => {
          setOpen(false);
          app.fire('generate_resource', resource.id, response);
        })
        .finally(() => {
          onLoading('');
        });
      return;
    }
    if (id === 'move_to') {
      setMoveTo(true);
      return;
    }
    if (id === 'move_to_trash') {
      onLoading(id);
      http
        .delete(`/namespaces/${namespaceId}/resources/${resource.id}`)
        .then(() => {
          setOpen(false);
          app.fire('delete_resource', resource.id, resource.parent_id);
          toast(t('resource.deleted'), {
            description: t('resource.deleted_description'),
            action: {
              label: t('undo'),
              onClick: () => {
                http
                  .post(
                    `/namespaces/${namespaceId}/resources/${resource.id}/restore`
                  )
                  .then(response => {
                    app.fire('generate_resource', response.parent_id, response);
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
  const handleMoveFinished = (resourceId: string, targetId: string) => {
    setMoveTo(false);
    setOpen(false);
    app.fire('move_resource', resourceId, targetId);
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!resource || !e.target.files) {
      return;
    }
    onLoading('import');
    uploadFiles(e.target.files, {
      namespaceId: namespaceId,
      parentId: resource.parent_id,
    })
      .then(responses => {
        app.fire('generate_resource', resource.parent_id, responses);
      })
      .catch(err => {
        toast(err && err.message ? err.message : err, {
          position: 'bottom-right',
        });
      })
      .finally(() => {
        fileInputRef.current!.value = '';
        onLoading('');
        setOpen(false);
      });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        {getTime(resource)}
      </div>
      <PermissionWrapper
        requiredPermission={0}
        forbidden={forbidden}
        permission={
          resource && resource.current_permission
            ? resource.current_permission
            : 'full_access'
        }
      >
        <Share />
      </PermissionWrapper>
      {resource && (
        <PermissionWrapper
          requiredPermission={1}
          forbidden={forbidden}
          permission={resource.current_permission || 'full_access'}
        >
          {editPage ? (
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
      )}
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
                        <Link />
                        <span>{t('actions.copy_link')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleAction('copy_content')}
                      >
                        <Files />
                        <span>{t('actions.copy_content')}</span>
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
                        onClick={() => handleAction('move_to')}
                      >
                        {loading === 'move_to' ? (
                          <LoaderCircle className="transition-transform animate-spin" />
                        ) : (
                          <CornerUpRight />
                        )}
                        <span>{t('actions.move_to')}</span>
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
                          asChild
                          onClick={() => handleAction('wide')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 items-center">
                              {loading === 'wide' ? (
                                <LoaderCircle className="transition-transform animate-spin" />
                              ) : (
                                <MoveHorizontal className="size-4" />
                              )}
                              <span>{t('actions.wide')}</span>
                            </div>
                            <Switch checked={wide} />
                          </div>
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
                multiple
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleUpload}
                accept={ALLOW_FILE_EXTENSIONS}
              />
              {resource && (
                <MoveTo
                  open={moveTo}
                  namespaceId={namespaceId}
                  onOpenChange={setMoveTo}
                  resourceId={resource.id}
                  onFinished={handleMoveFinished}
                />
              )}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
