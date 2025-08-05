import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  parseShareInfo,
  ShareInfo,
  ShareType,
  UpdateShareInfoReq,
} from '@/interface';
import { http } from '@/lib/request';
import { t } from 'i18next';
import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Expire } from './expire';
import { ShareTypeSelector } from './share-type';
import { Password } from './password';

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
      .then((data) => {
        setShareInfo(parseShareInfo(data));
      });
  }, [namespace_id, resource_id]);

  const updateShareInfo = (data: UpdateShareInfoReq) => {
    http
      .patch(`namespaces/${namespace_id}/resources/${resource_id}/share`, data)
      .then((data) => {
        setShareInfo(parseShareInfo(data));
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

  const handleExpireDateChange = (expiresAt: Date | null) => {
    updateShareInfo({ expires_at: expiresAt });
  };

  const handleExpireCountdownChange = (seconds: number) => {
    updateShareInfo({ expires_seconds: seconds });
  };

  const handleShareTypeChange = (shareType: ShareType) => {
    updateShareInfo({ share_type: shareType });
  };

  const handlePasswordChange = (password: string | null) => {
    updateShareInfo({ password });
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
        <span className="text-sm">{t('publish.all_resources')}</span>
        <Switch
          checked={shareInfo?.all_resources}
          disabled={!shareInfo?.enabled}
          onCheckedChange={handleShareAll}
        />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">{t('publish.require_login')}</span>
        <Switch
          checked={shareInfo?.require_login}
          disabled={!shareInfo?.enabled}
          onCheckedChange={handleRequireLogin}
        />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">{t('publish.expire.title')}</span>
        <Expire
          disabled={!shareInfo?.enabled}
          expiresAt={shareInfo ? shareInfo.expires_at : null}
          onNeverSelected={() => handleExpireDateChange(null)}
          onDateSelected={handleExpireDateChange}
          onCountdownSelected={handleExpireCountdownChange}
        />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">{t('publish.ai_chat')}</span>
        <ShareTypeSelector
          disabled={!shareInfo?.enabled}
          shareType={shareInfo?.share_type || 'all'}
          onChange={handleShareTypeChange}
        />
      </div>
      <div className="flex items-center gap-2 justify-between mt-4 h-6">
        <span className="text-sm">{t('publish.password')}</span>
        <Password
          disabled={!shareInfo?.enabled}
          passwordEnabled={!!shareInfo?.password_enabled}
          onSave={handlePasswordChange}
        />
      </div>
    </div>
  );
}
