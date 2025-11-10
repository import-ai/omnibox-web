import axios from 'axios';
import {
  ChevronRight,
  FileUp,
  GlobeIcon,
  LoaderCircle,
  MessageCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import { IResourceData, Resource, ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';
import { getTime } from '@/page/resource/utils';
import ResourceIcon from '@/page/sidebar/content/resourceIcon';

export default function FeatureCards() {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const navigate = useNavigate();
  const [progress, setProgress] = useState('');
  const { namespace_id: namespaceId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
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
      toast.success(t('chat.home.upload.success', { count: fileCount }));

      if (results.length > 0) {
        const lastUploadedFile = results[results.length - 1];
        navigate(`/${namespaceId}/${lastUploadedFile.id}`);
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
      autoAction: {
        type: 'bind' as const,
        appId: 'wechat_bot',
      },
    });
  };

  const handleBrowserClick = () => {
    const isZh = i18n.language.startsWith('zh');
    const url = isZh
      ? '/docs/zh-cn/collect/browser-extension'
      : '/docs/collect/browser-extension';
    window.open(url, '_blank');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
      {/* Upload Files Card */}
      <Card className="dark:bg-[#303030] dark:border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            {t('chat.home.upload.title')}
          </CardTitle>
          <CardDescription className="text-base font-medium text-foreground">
            {t('chat.home.upload.subtitle')}
          </CardDescription>
          <CardDescription className="text-sm text-muted-foreground">
            {t('chat.home.upload.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <input
            type="file"
            multiple
            accept={ALLOW_FILE_EXTENSIONS}
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <TooltipProvider>
            <div className="flex gap-2">
              {uploading ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="opacity-50">
                      <LoaderCircle className="w-4 h-4 text-red-500 animate-spin" />
                      {t('chat.home.upload.local')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {progress || t('chat.home.upload.local_tooltip')}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="w-4 h-4 text-red-500" />
                      {t('chat.home.upload.local')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('chat.home.upload.local_tooltip')}
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWeChatClick}
                  >
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    {t('chat.home.upload.wechat')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('chat.home.upload.wechat_tooltip')}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBrowserClick}
                  >
                    <GlobeIcon className="w-4 h-4 text-blue-500" />
                    {t('chat.home.upload.browser')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('chat.home.upload.browser_tooltip')}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Recent Resources Card */}
      <Card className="bg-white dark:bg-[#303030] border-gray-200 dark:border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            {t('chat.home.recent.title', {
              defaultValue: 'Recently Updated',
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              {t('chat.home.recent.empty', {
                defaultValue: 'No recent resources',
              })}
            </div>
          ) : (
            <div className="max-h-28 overflow-y-auto pr-1 space-y-1 no-scrollbar">
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
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/${namespaceId}/${item.id}`)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="[&>svg]:w-4 [&>svg]:h-4">
                        <ResourceIcon expand={false} resource={iconResource} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate group-hover:text-foreground">
                          {name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {time}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
