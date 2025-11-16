import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { HelpTooltip } from '@/components/help-tooltip';
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

import { Expire } from './expire';
import { Password } from './password';
import { ShareTypeSelector } from './share-type';

interface ShareTabContentProps {
  resource_id: string;
  namespace_id: string;
}

export function ShareTabContent(props: ShareTabContentProps) {
  const { resource_id, namespace_id } = props;
  const { t } = useTranslation();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  useEffect(() => {
    if (!namespace_id || !resource_id) {
      return;
    }
    http
      .get(`namespaces/${namespace_id}/resources/${resource_id}/share`)
      .then(data => {
        setShareInfo(parseShareInfo(data));
      });
  }, [namespace_id, resource_id]);

  const updateShareInfo = (data: UpdateShareInfoReq) => {
    http
      .patch(`namespaces/${namespace_id}/resources/${resource_id}/share`, data)
      .then(data => {
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
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast(t('copy.success'), { position: 'bottom-right' });
      } catch (error: any) {
        toast(error.message, { position: 'bottom-right' });
      }
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
          placeholder={t('share.share.url_placeholder')}
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
        <Switch
          checked={shareInfo?.enabled ?? false}
          onCheckedChange={handleEnable}
        />
      </div>
      {shareInfo?.enabled && (
        <>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm flex items-center gap-1">
              <Trans i18nKey="share.share.current_file_only" />
              <HelpTooltip
                content={t('share.share.current_file_only_tooltip')}
              />
            </span>
            <Switch
              checked={!(shareInfo?.all_resources ?? false)}
              disabled={!shareInfo?.enabled}
              onCheckedChange={handleShareAll}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm flex items-center gap-1">
              <Trans i18nKey="share.share.require_login" />
              <HelpTooltip content={t('share.share.require_login_tooltip')} />
            </span>
            <Switch
              checked={shareInfo?.require_login ?? false}
              disabled={!shareInfo?.enabled}
              onCheckedChange={handleRequireLogin}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm">{t('share.share.expire.title')}</span>
            <Expire
              disabled={!shareInfo?.enabled}
              expiresAt={shareInfo ? shareInfo.expires_at : null}
              onNeverSelected={() => handleExpireDateChange(null)}
              onDateSelected={handleExpireDateChange}
              onCountdownSelected={handleExpireCountdownChange}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm">{t('share.share.ai_chat')}</span>
            <ShareTypeSelector
              disabled={!shareInfo?.enabled}
              shareType={shareInfo?.share_type || 'doc_only'}
              onChange={handleShareTypeChange}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm">{t('share.share.password')}</span>
            <Password
              disabled={!shareInfo?.enabled}
              passwordEnabled={!!shareInfo?.password_enabled}
              onSave={handlePasswordChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
