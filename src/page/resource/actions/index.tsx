import copy from 'copy-to-clipboard';
import JSZip from 'jszip';
import {
  ArrowUp,
  ChevronRight,
  Copy,
  CornerUpRight,
  Download,
  Files,
  Link,
  LoaderCircle,
  MoreHorizontal,
  MoveHorizontal,
  Pencil,
  PencilOff,
  Save,
  Trash2,
} from 'lucide-react';
// import { Resource } from '@/interface';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import PermissionWrapper from '@/components/permission-action/wrapper';
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
import { Switch } from '@/components/ui/switch';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [loading, onLoading] = useState('');
  const [moveTo, setMoveTo] = useState(false);
  const [downloadAsOpen, setDownloadAsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // http://localhost:5173/ddElvT/wDH1iyjgjVzyzgiV/attachments/J7nt9VEvSXqpqUGFr6wGHsW74YQlSrVG.jpg
  // baseUrl/namespaceId/resourceId/md解析图片地址
  const href = window.location.href;
  console.log(
    'resourcecontent',
    resource,
    `${href}/attachments/J7nt9VEvSXqpqUGFr6wGHsW74YQlSrVG.jpg`
  );

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
    if (id === 'download_as_markdown') {
      if (!resource.content) {
        toast(t('resource.no_content'), {
          position: 'bottom-right',
        });
        setOpen(false);
        return;
      }

      // 生成文件名：优先使用 resource.name，如果为空则使用"未命名"
      const baseName = resource.name || t('untitled');
      const fileName = baseName.endsWith('.md') ? baseName : `${baseName}.md`;

      // 解析 markdown 中的所有图片链接
      const imageLinks = parseImageLinks(resource.content);
      const href = window.location.href;
      const imageArray = imageLinks.map(item => `${href}/${item}`);

      // 如果没有图片，直接下载 markdown 文件
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

      // 如果有图片，打包成 zip
      onLoading('download_as_markdown');
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');

      // 处理图片并收集替换映射
      const imagePromises: Promise<{
        oldUrl: string;
        newPath: string;
        alt: string;
      } | null>[] = [];

      imageArray.forEach((imageUrl, idx) => {
        const promise = (async () => {
          try {
            // 下载图片（需要认证）
            const token = localStorage.getItem('token') || '';
            const headers: HeadersInit = {};
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(imageUrl, {
              headers,
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            // 检查响应类型
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('image/')) {
              throw new Error(`Invalid image content type: ${contentType}`);
            }

            const imageData = await response.blob();

            // 从响应头或 URL 获取扩展名
            let imageExtension = 'png';
            if (contentType.includes('image/')) {
              const mimeType = contentType.split('/')[1];
              imageExtension = mimeType === 'jpeg' ? 'jpg' : mimeType;
            } else {
              // 尝试从 URL 获取扩展名
              const urlMatch = imageUrl.match(
                /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i
              );
              if (urlMatch) {
                imageExtension = urlMatch[1].toLowerCase();
                if (imageExtension === 'jpeg') imageExtension = 'jpg';
              }
            }

            // 生成图片文件名
            const imageFileName = `image${idx + 1}.${imageExtension}`;
            const imagePath = `images/${imageFileName}`;

            // 添加到 zip
            if (imagesFolder) {
              const arrayBuffer = await imageData.arrayBuffer();
              imagesFolder.file(imageFileName, arrayBuffer);
            }

            // 返回替换映射
            const originalLink = imageLinks[idx];
            const imageRegex = new RegExp(
              `!\\[([^\\]]*)\\]\\(${originalLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
              'g'
            );
            const match = imageRegex.exec(resource.content || '');
            const alt = match ? match[1] : '';

            return {
              oldUrl: originalLink,
              newPath: imagePath,
              alt: alt,
            };
          } catch (error) {
            console.error(`Failed to process image ${idx + 1}:`, error);
            console.error('Image URL:', imageUrl);
            return null;
          }
        })();

        imagePromises.push(promise);
      });

      // 等待所有图片处理完成
      Promise.all(imagePromises)
        .then(replacements => {
          // 收集所有成功的替换映射
          const validReplacements = replacements.filter(
            (r): r is { oldUrl: string; newPath: string; alt: string } =>
              r !== null
          );

          // 修改 markdown 内容：替换所有图片路径
          let modifiedContent: string = resource.content || '';
          validReplacements.forEach(({ oldUrl, newPath, alt }) => {
            // 使用完整的 markdown 语法替换
            const imagePattern = new RegExp(
              `!\\[${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
              'g'
            );
            modifiedContent = modifiedContent.replace(
              imagePattern,
              `![${alt}](${newPath})`
            );
          });

          // 添加 markdown 文件到 zip
          zip.file(fileName, modifiedContent);

          // 生成 zip 文件
          return zip.generateAsync({ type: 'blob' });
        })
        .then(zipBlob => {
          // 下载 zip 文件
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
                    {/* 下载为 */}
                    <SidebarMenuItem>
                      <Popover
                        open={downloadAsOpen}
                        onOpenChange={setDownloadAsOpen}
                      >
                        <PopoverTrigger asChild>
                          <SidebarMenuButton
                            onMouseEnter={() => setDownloadAsOpen(true)}
                            onMouseLeave={() => setDownloadAsOpen(false)}
                          >
                            <Download />
                            <span>{t('actions.download_as')}</span>
                            <ChevronRight className="ml-auto" />
                          </SidebarMenuButton>
                        </PopoverTrigger>
                        <PopoverContent
                          side="right"
                          align="start"
                          className="w-48 p-1"
                          onMouseEnter={() => setDownloadAsOpen(true)}
                          onMouseLeave={() => setDownloadAsOpen(false)}
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                              onClick={() => {
                                handleAction('download_as_markdown');
                                setDownloadAsOpen(false);
                              }}
                            >
                              {t('actions.download_as_tooltip', {
                                format: 'Markdown',
                              })}
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </SidebarMenuItem>

                    {resource && resource.resource_type === 'file' && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleAction('download')}
                        >
                          {loading === 'download' ? (
                            <LoaderCircle className="transition-transform animate-spin" />
                          ) : (
                            <Download />
                          )}
                          <span>{t('actions.download')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
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
