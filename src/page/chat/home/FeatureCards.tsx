import axios from 'axios';
import { ChevronRight, FileUp, Link, MessageCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ExtensionIcon } from '@/assets/icons/ExtensionIcon';
import { Button } from '@/components/Button';
import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/useApp';
import { IResourceData, Resource, ResourceMeta } from '@/interface';
import { openFilePicker } from '@/lib/openFilePicker';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/uploadFiles';
import { cn } from '@/lib/utils';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import { getTime } from '@/page/resource/utils';

import { AddLinkPanel } from './AddLinkPanel';

/** English “Extension” label, used as the shared width for both languages. */
const importActionWidthLabel = 'Extension';

function ImportActionButton({
  tooltip,
  tooltipDelay,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  tooltip: React.ReactNode;
  tooltipDelay?: number;
}) {
  return (
    <div className="relative">
      <Button
        type="button"
        aria-hidden
        tabIndex={-1}
        variant="outline"
        size="sm"
        className="pointer-events-none invisible"
      >
        <ExtensionIcon />
        {importActionWidthLabel}
      </Button>
      <Tooltip delayDuration={tooltipDelay}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            {...props}
            className="absolute inset-0"
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function FeatureCards() {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const navigate = useNavigate();
  const [progress, setProgress] = useState('');
  const { namespace_id: namespaceId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [actionsEntering, setActionsEntering] = useState(false);
  const [recent, setRecent] = useState<ResourceMeta[]>([]);

  useEffect(() => {
    if (!namespaceId) return;
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/resources/recent?limit=6`, {
        cancelToken: source.token,
        mute: true,
      })
      .then((items: ResourceMeta[] = []) => {
        setRecent((items || []).slice(0, 6));
      })
      .finally(() => void 0);
    return () => source.cancel();
  }, [namespaceId]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (uploading) return;

    if (!namespaceId) {
      toast.error('Namespace not found');
      return;
    }

    setUploading(true);
    setProgress(`${0}/${files.length}`);

    try {
      // Fetch the root resources for the namespace
      const rootData: { [key: string]: IResourceData } = await http.get(
        `/namespaces/${namespaceId}/root?namespace_id=${namespaceId}`
      );

      // Get the private space root resource
      const privateRoot = rootData['private'];
      if (!privateRoot) {
        toast.error('Private root resource not found');
        return;
      }

      // Upload files to the private root
      const results = await uploadFiles(files, {
        namespaceId,
        parentId: privateRoot.id,
        onProgress: ({ done, total }) => {
          setProgress(`${done}/${total}`);
        },
      });

      setProgress('');

      const fileCount = results.length;
      toast.success(t('upload.success', { count: fileCount }));

      if (results.length > 0) {
        const lastUploadedFile = results[results.length - 1];
        navigateToResource(navigate, `/${namespaceId}/${lastUploadedFile.id}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Upload failed';
      toast.error(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleWeChatClick = () => {
    app.fire('open_settings', {
      tab: 'applications',
    });
  };

  const handleBrowserClick = () => {
    const isZh = i18n.language.startsWith('zh');
    const url = isZh
      ? '/docs/zh-cn/browser-extension'
      : '/docs/browser-extension';
    window.open(url, '_blank');
  };

  return (
    <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
      {/* Upload Files Card */}
      <Card className="min-w-0 gap-4 [--card-spacing:--spacing(5)]">
        {!(linkMode && namespaceId) && (
          <CardHeader>
            <CardTitle>{t('chat.home.upload.title')}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex flex-1 flex-col gap-2">
          {linkMode && namespaceId ? (
            <AddLinkPanel
              key={namespaceId}
              namespaceId={namespaceId}
              onCancel={() => {
                setActionsEntering(true);
                setLinkMode(false);
              }}
              onSaved={resourceId =>
                navigateToResource(navigate, `/${namespaceId}/${resourceId}`)
              }
            />
          ) : (
            <div className="space-y-1">
              <p className="font-medium">{t('chat.home.upload.subtitle')}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('chat.home.upload.description')}
              </p>
            </div>
          )}
          <input
            type="file"
            multiple
            accept={ALLOW_FILE_EXTENSIONS}
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          {!(linkMode && namespaceId) && (
            <TooltipProvider>
              <div
                className={cn(
                  'mt-auto grid w-fit grid-cols-2 justify-items-start gap-2',
                  actionsEntering &&
                    'motion-safe:animate-[upload-actions-in_200ms_ease_both]'
                )}
                onAnimationEnd={() => setActionsEntering(false)}
              >
                {uploading ? (
                  <ImportActionButton
                    tooltip={progress || t('chat.home.upload.local_tooltip')}
                    tooltipDelay={0}
                    disabled
                  >
                    <Spinner className="text-red-500" />
                    {t('chat.home.upload.local')}
                  </ImportActionButton>
                ) : (
                  <ImportActionButton
                    tooltip={t('chat.home.upload.local_tooltip')}
                    onClick={() => openFilePicker(fileInputRef.current)}
                  >
                    <FileUp className="size-4 text-red-500" />
                    {t('chat.home.upload.local')}
                  </ImportActionButton>
                )}
                <ImportActionButton
                  tooltip={t('chat.home.upload.link_tooltip')}
                  onClick={() => setLinkMode(true)}
                >
                  <Link className="size-4 text-blue-500" />
                  {t('chat.home.upload.link')}
                </ImportActionButton>
                <ImportActionButton
                  tooltip={t('chat.home.upload.wechat_tooltip')}
                  onClick={handleWeChatClick}
                >
                  <MessageCircle className="size-4 text-green-500" />
                  {t('chat.home.upload.wechat')}
                </ImportActionButton>
                <ImportActionButton
                  tooltip={t('chat.home.upload.browser_tooltip')}
                  onClick={handleBrowserClick}
                >
                  <ExtensionIcon />
                  {t('chat.home.upload.browser')}
                </ImportActionButton>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Recent Resources Card */}
      <Card className="min-w-0 gap-4 [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>
            {t('chat.home.recent.title', {
              defaultValue: 'Recently Updated',
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">
              {t('chat.home.recent.empty', {
                defaultValue: 'No recent resources',
              })}
            </div>
          ) : (
            <div className="max-h-28 space-y-1 overflow-y-auto">
              {recent.map(item => {
                const name = item.name || t('untitled');
                const time = getTime(item as any, i18n);
                const iconResource = {
                  id: item.id,
                  name: item.name,
                  resource_type: item.resource_type,
                  parent_id: '',
                  space_type: 'private',
                  has_children: !!item.has_children,
                  attrs: (item as any).attrs || {},
                } as unknown as Resource;
                return (
                  <div
                    key={item.id}
                    className="group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent/50"
                    onClick={() =>
                      navigateToResource(navigate, `/${namespaceId}/${item.id}`)
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="[&>svg]:size-4">
                        <ResourceTypeIcon
                          expand={false}
                          resource={iconResource}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm group-hover:text-foreground">
                          {name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {time}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
