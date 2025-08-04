import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ShareInfo, UpdateShareInfoReq } from '@/interface';
import { http } from '@/lib/request';
import { t } from 'i18next';
import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Expire } from './expire';

interface PublishProps {
  resource_id: string;
  namespace_id: string;
}

export function Publish(props: PublishProps) {
  const { resource_id, namespace_id } = props;
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  useEffect(() => {
    if (!namespace_id || !resource_id) {
      return;
    }
    http
      .get(`namespaces/${namespace_id}/resources/${resource_id}/share`)
      .then(setShareInfo);
  }, [namespace_id, resource_id]);

  const updateShareInfo = (data: UpdateShareInfoReq) => {
    http
      .patch(`namespaces/${namespace_id}/resources/${resource_id}/share`, data)
      .then((data) => {
        setShareInfo(data);
      });
  };

  const shareUrl = shareInfo?.enabled
    ? `${location.origin}/s/${shareInfo.id}`
    : '';

  const handleEnable = (enabled: boolean) => {
    updateShareInfo({ enabled });
  };

  const handleRequireLogin = (enabled: boolean) => {
    updateShareInfo({ require_login: enabled });
  };

  const handleShareAll = (enabled: boolean) => {
    updateShareInfo({ all_resources: enabled });
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="pb-2">
      <div className="flex gap-2 items-center">
        <Input
          readOnly
          value={shareUrl}
          placeholder={t('publish.url_placeholder')}
          disabled={!shareUrl}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          disabled={!shareUrl}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Switch checked={shareInfo?.enabled} onCheckedChange={handleEnable} />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">Share all resources</span>
        <Switch
          checked={shareInfo?.all_resources}
          disabled={!shareInfo?.enabled}
          onCheckedChange={handleShareAll}
        />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">Require login</span>
        <Switch
          checked={shareInfo?.require_login}
          disabled={!shareInfo?.enabled}
          onCheckedChange={handleRequireLogin}
        />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">Expire</span>
        <Expire expiresAt={shareInfo ? shareInfo.expires_at : null} />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">Share type</span>
        <Switch />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">Password</span>
        <Switch />
      </div>
    </div>
  );
}
