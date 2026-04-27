import copy from 'copy-to-clipboard';
import JSZip from 'jszip';
import {
  ArrowUp,
  Copy,
  Download,
  Files,
  Link,
  MoreHorizontal,
  Move,
  MoveHorizontal,
  Pencil,
  PencilOff,
  Save,
  Trash2,
} from 'lucide-react';
// import { Resource } from '@/interface';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import PermissionWrapper from '@/components/permission-action/wrapper';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useDeleteResource } from '@/hooks/use-delete-resource';
import { useIsMobile } from '@/hooks/use-mobile';
import { IUseResource } from '@/hooks/user-resource';
import { downloadFile } from '@/lib/download-file';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';
import { getTime, parseImageLinks } from '@/page/resource/utils';

import MoveTo from './move';
import ShareAction from './share';

export interface IActionProps extends IUseResource {
  wide: boolean;
  onWide: (wide: boolean) => void;
}

export default function Actions(props: IActionProps) {
  const { app, wide, onWide, forbidden, resource, editPage, namespaceId } =
    props;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();
  const isMobile = useIsMobile();
  const { deleteResource } = useDeleteResource();
  const [open, setOpen] = useState(false);
  const [loading, onLoading] = useState('');
  const [moveTo, setMoveTo] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    if (!resource) {
      return;
    }
    navigate(`/${namespaceId}/${resource.id}/edit`, {
      state: loc.state,
    });
  };
  const handleExitEdit = () => {
    if (!resource) {
      return;
    }
    navigate(`/${namespaceId}/${resource.id}`, {
      state: loc.state,
    });
  };
  const handleSave = () => {
    app.fire('save', () => {
      if (!resource) {
        return;
      }
      navigate(`/${namespaceId}/${resource.id}`, {
        state: loc.state,
      });
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
    if (id === 'download') {
      onLoading(id);
      downloadFile(namespaceId, resource.id, resource.attrs?.original_name)
        .then(() => {
          setOpen(false);
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
      if (!resource) {
        setOpen(false);
        return;
      }
      onLoading('move_to_trash');
      deleteResource({
        id: resource.id,
        parentId: resource.parent_id,
        namespaceId,
        onSuccess: () => setOpen(false),
      }).finally(() => {
        onLoading('');
      });
      return;
    }
    if (id === 'import') {
      fileInputRef.current?.click();
      return;
    }
    if (id === 'download_as_markdown') {
      if (!resource.content) {
        toast(t('resource.no_content'), {
          position: 'bottom-right',
        });
        setOpen(false);
        return;
      }

      // generate file name: use resource.name, if empty, use "untitled"
      const baseName = resource.name || t('untitled');
      const fileName = baseName.endsWith('.md') ? baseName : `${baseName}.md`;

      const imageLinks = parseImageLinks(resource.content);
      const imageArray = imageLinks.map(item => `${resource.id}/${item}`);

      // if no image, download markdown file
      if (imageArray.length === 0) {
        const blob = new Blob([resource.content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setOpen(false);
        return;
      }

      // if has image, pack into zip
      onLoading('download_as_markdown');
      const zip = new JSZip();
      const attachmentsFolder = zip.folder('attachments');

      const imagePromises: Promise<void>[] = [];

      imageArray.forEach((imageUrl, idx) => {
        const promise = (async () => {
          try {
            const response = await fetch(imageUrl);

            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const imageBlob = await response.blob();
            const arrayBuffer = await imageBlob.arrayBuffer();

            // get file name from image url
            const originalLink = imageLinks[idx];
            const fileName = originalLink.split('/').pop() || `image${idx + 1}`;

            // add to zip
            if (attachmentsFolder) {
              attachmentsFolder.file(fileName, arrayBuffer);
            }
          } catch (error) {
            console.error(`Failed to process image ${idx + 1}:`, error);
            console.error('Image URL:', imageUrl);
          }
        })();

        imagePromises.push(promise);
      });

      // wait for all images to be processed
      Promise.all(imagePromises)
        .then(() => {
          // add markdown file to zip (no modification, keep original)
          zip.file(fileName, resource.content || '');

          // generate zip file
          return zip.generateAsync({ type: 'blob' });
        })
        .then(zipBlob => {
          // download zip file
          const url = window.URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${baseName}.zip`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setOpen(false);
        })
        .catch(error => {
          console.error('Failed to create zip:', error);
          toast(t('download.failed'), {
            position: 'bottom-right',
          });
        })
        .finally(() => {
          onLoading('');
        });

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
    onLoading('upload_to_folder');
    uploadFiles(e.target.files, {
      namespaceId: namespaceId,
      parentId: resource.id,
      onProgress: ({ done, total }) => {
        setProgress(`${done}/${total}`);
      },
    })
      .then(responses => {
        app.fire('generate_resource', resource.id, responses);
        toast.success(
          t('upload.success', { count: e.target.files?.length || 1 })
        );
      })
      .catch(err => {
        toast(err && err.message ? err.message : err, {
          position: 'bottom-right',
        });
      })
      .finally(() => {
        fileInputRef.current!.value = '';
        onLoading('');
        setProgress('');
        setOpen(false);
      });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        {getTime(resource, i18n)}
      </div>
      {resource && (
        <PermissionWrapper
          requiredPermission={0}
          forbidden={forbidden}
          permission={
            resource.current_permission
              ? resource.current_permission
              : 'full_access'
          }
          // spaceType={resource.space_type}
        >
          <ShareAction spaceType={resource.space_type} />
        </PermissionWrapper>
      )}
      {resource && (
        <PermissionWrapper
          requiredPermission={1}
          forbidden={forbidden}
          permission={resource.current_permission || 'full_access'}
        >
          {editPage ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Save />
                {t('header.actions.save')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExitEdit}>
                <PencilOff />
                {t('header.actions.discard')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleEdit}>
                <Pencil />
                {t('header.actions.edit')}
              </Button>
            </>
          )}
        </PermissionWrapper>
      )}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-[state=open]:bg-accent"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => handleAction('copy_link')}
          >
            <Link className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
            <span>{t('actions.copy_link')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => handleAction('copy_content')}
          >
            <Files className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
            <span>{t('actions.copy_content')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => handleAction('duplicate')}
          >
            {loading === 'duplicate' ? (
              <Spinner />
            ) : (
              <Copy className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
            )}
            <span>{t('actions.duplicate')}</span>
          </DropdownMenuItem>
          {/* Download Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2">
              <Download className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
              <span>{t('actions.download_as')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {resource && resource.resource_type === 'file' && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleAction('download')}
                >
                  {t('actions.download')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleAction('download_as_markdown')}
              >
                {t('actions.download_as_tooltip', { format: 'Markdown' })}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => handleAction('move_to')}
          >
            {loading === 'move_to' ? (
              <Spinner />
            ) : (
              <Move className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
            )}
            <span>{t('actions.move_to')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group cursor-pointer gap-2 data-[highlighted]:text-destructive"
            onClick={() => handleAction('move_to_trash')}
          >
            {loading === 'move_to_trash' ? (
              <Spinner />
            ) : (
              <Trash2 className="size-4 text-neutral-500 dark:text-[#a1a1a1] group-hover:text-destructive" />
            )}
            <span>{t('actions.move_to_trash')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {!isMobile && (
            <>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => handleAction('wide')}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {loading === 'wide' ? (
                      <Spinner />
                    ) : (
                      <MoveHorizontal className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
                    )}
                    <span>{t('actions.wide')}</span>
                  </div>
                  <Switch checked={wide} />
                </div>
              </DropdownMenuItem>
              {resource && resource.resource_type === 'folder' && (
                <DropdownMenuSeparator />
              )}
            </>
          )}

          {resource && resource.resource_type === 'folder' && (
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => handleAction('import')}
            >
              {loading === 'upload_to_folder' ? (
                <Spinner />
              ) : (
                <ArrowUp className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
              )}
              <span>
                {loading === 'upload_to_folder'
                  ? `${t('actions.upload_to_folder')} ${progress}`
                  : t('actions.upload_to_folder')}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="hidden">
        <Input
          multiple
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept={ALLOW_FILE_EXTENSIONS}
        />
      </div>
      {resource && (
        <MoveTo
          open={moveTo}
          namespaceId={namespaceId}
          onOpenChange={setMoveTo}
          resourceId={resource.id}
          onFinished={handleMoveFinished}
        />
      )}
    </div>
  );
}
