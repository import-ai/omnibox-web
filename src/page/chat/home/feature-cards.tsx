import {
  ChevronRight,
  FileUp,
  GlobeIcon,
  LoaderCircle,
  MessageCircle,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
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
import useApp from '@/hooks/use-app';
import { IResourceData } from '@/interface';
import { http } from '@/lib/request';
import { uploadFiles } from '@/lib/upload-files';

export default function FeatureCards() {
  const { t, i18n } = useTranslation();
  const app = useApp();
  const navigate = useNavigate();
  const { namespace_id: namespaceId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const suggestions: { title: string; description: string; url: string }[] = [];

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
      });

      const fileCount = results.length;
      toast.success(
        `${fileCount} ${fileCount === 1 ? 'file' : 'files'} uploaded successfully`
      );

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
            accept="*/*"
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <LoaderCircle className="w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4 text-red-500" />
              )}
              {t('chat.home.upload.local')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleWeChatClick}>
              <MessageCircle className="w-4 h-4 text-green-500" />
              {t('chat.home.upload.wechat')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleBrowserClick}>
              <GlobeIcon className="w-4 h-4 text-blue-500" />
              {t('chat.home.upload.browser')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Card */}
      {suggestions.length > 0 && (
        <Card className="bg-white dark:bg-[#303030] border-gray-200 dark:border-none shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">
              {t('chat.home.suggestions.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(suggestion => (
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{suggestion.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
