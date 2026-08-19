import { Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { HelpTooltip } from '@/components/help-tooltip';
import { Input } from '@/components/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
  parseShareInfo,
  ResourceType,
  ShareInfo,
  ShareType,
  UpdateShareInfoReq,
} from '@/interface';
import { http } from '@/lib/request';
import type { ResourceSortOptions } from '@/service/resource';

import { Expire } from './Expire';
import { Password } from './Password';
import { ShareSortSelector } from './ShareSortSelector';
import { ShareTypeSelector } from './ShareTypeSelector';

interface ShareTabContentProps {
  resource_id: string;
  namespace_id: string;
  resourceType: ResourceType;
}

const folderResourceTypes: ResourceType[] = [
  'folder',
  'smart_folder',
  'rss_folder',
];

export function ShareTabContent(props: ShareTabContentProps) {
  const { resource_id, namespace_id, resourceType } = props;
  const { t } = useTranslation();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [normalizationFailed, setNormalizationFailed] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestVersionRef = useRef(0);
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isFolder = folderResourceTypes.includes(resourceType);
  const sortUnsupportedTooltipKey =
    resourceType === 'smart_folder'
      ? 'share.share.sort.smart_folder_unsupported'
      : resourceType === 'rss_folder'
        ? 'share.share.sort.rss_folder_unsupported'
        : null;
  const resourceKey = `${namespace_id}/${resource_id}`;
  const resourceKeyRef = useRef(resourceKey);
  resourceKeyRef.current = resourceKey;

  useEffect(() => {
    let active = true;
    const requestVersion = ++requestVersionRef.current;
    setShareInfo(null);
    setNormalizationFailed(false);

    if (!namespace_id || !resource_id) {
      return () => {
        active = false;
      };
    }

    const loadShareInfo = async () => {
      let currentShareInfo: ShareInfo | null = null;

      try {
        await updateQueueRef.current;
        if (!active || resourceKeyRef.current !== resourceKey) {
          return;
        }
        const data = await http.get(
          `namespaces/${namespace_id}/resources/${resource_id}/share`
        );
        currentShareInfo = parseShareInfo(data);
        if (
          isFolder &&
          currentShareInfo.enabled &&
          !currentShareInfo.all_resources
        ) {
          if (!active || resourceKeyRef.current !== resourceKey) {
            return;
          }
          const data = await http.patch(
            `namespaces/${namespace_id}/resources/${resource_id}/share`,
            { all_resources: true }
          );
          currentShareInfo = parseShareInfo(data);
        }

        if (
          active &&
          resourceKeyRef.current === resourceKey &&
          requestVersionRef.current === requestVersion
        ) {
          setShareInfo(currentShareInfo);
        }
      } catch {
        if (
          active &&
          currentShareInfo &&
          resourceKeyRef.current === resourceKey &&
          requestVersionRef.current === requestVersion
        ) {
          setShareInfo(currentShareInfo);
          setNormalizationFailed(
            isFolder &&
              currentShareInfo.enabled &&
              !currentShareInfo.all_resources
          );
        }
      }
    };

    void loadShareInfo();

    return () => {
      active = false;
    };
  }, [isFolder, namespace_id, reloadVersion, resource_id, resourceKey]);

  const updateShareInfo = (data: UpdateShareInfoReq) => {
    const requestResourceKey = resourceKey;
    updateQueueRef.current = updateQueueRef.current
      .then(async () => {
        const requestVersion = ++requestVersionRef.current;
        const response = await http.patch(
          `namespaces/${namespace_id}/resources/${resource_id}/share`,
          data
        );
        if (
          resourceKeyRef.current === requestResourceKey &&
          requestVersionRef.current === requestVersion
        ) {
          setShareInfo(parseShareInfo(response));
          setNormalizationFailed(false);
        }
      })
      .catch(() => undefined);
  };

  const shareUrl =
    shareInfo?.enabled && !normalizationFailed
      ? `${location.origin}/s/${shareInfo.id}`
      : '';

  const handleEnable = (enabled: boolean) => {
    updateShareInfo({
      enabled,
      ...(isFolder ? { all_resources: true } : {}),
    });
  };

  const handleRequireLogin = (enabled: boolean) => {
    updateShareInfo({ require_login: enabled });
  };

  const handleOnlyCurrent = (onlyCurrent: boolean) => {
    updateShareInfo({ all_resources: !onlyCurrent });
  };

  const handleSortChange = (sort: ResourceSortOptions) => {
    updateShareInfo(sort);
  };

  const handleCopy = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast(t('actions.copy_link_success'), { position: 'bottom-right' });
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

  const currentFileOnlySwitch = (
    <Switch
      checked={!(shareInfo?.all_resources ?? false)}
      disabled={!shareInfo?.enabled || isFolder}
      onCheckedChange={handleOnlyCurrent}
    />
  );
  // A chat-only share never lists resources, so its ordering is meaningless.
  const isChatOnly = shareInfo?.share_type === 'chat_only';
  const shareSortSelector = shareInfo?.enabled ? (
    <ShareSortSelector
      disabled={
        !shareInfo.all_resources || !!sortUnsupportedTooltipKey || isChatOnly
      }
      manualSortAvailable={shareInfo.manual_sort_available}
      sort={{
        sort_by: shareInfo.sort_by,
        sort_order: shareInfo.sort_order,
      }}
      onChange={handleSortChange}
    />
  ) : null;

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
          disabled={!shareInfo}
          onCheckedChange={handleEnable}
        />
      </div>
      {normalizationFailed && (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 text-xs text-destructive"
        >
          <span>{t('share.share.folder_share_update_failed')}</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0 text-destructive"
            onClick={() => setReloadVersion(version => version + 1)}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      {shareInfo?.enabled && (
        <>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm flex items-center gap-1">
              <Trans i18nKey="share.share.current_file_only" />
              <HelpTooltip
                content={t('share.share.current_file_only_tooltip')}
              />
            </span>
            {isFolder ? (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help">
                      {currentFileOnlySwitch}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('share.share.folder_current_file_unsupported')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              currentFileOnlySwitch
            )}
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm flex items-center gap-1">
              {t('share.share.sort.label')}
              <HelpTooltip content={t('share.share.sort.tooltip')} />
            </span>
            {sortUnsupportedTooltipKey ? (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-not-allowed">
                      {shareSortSelector}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t(sortUnsupportedTooltipKey)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              shareSortSelector
            )}
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm flex items-center gap-1">
              <Trans i18nKey="share.share.require_login" />
              <HelpTooltip content={t('share.share.require_login_tooltip')} />
            </span>
            <Switch
              checked={shareInfo?.require_login ?? false}
              disabled={!shareInfo?.enabled || normalizationFailed}
              onCheckedChange={handleRequireLogin}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm">{t('share.share.expire.title')}</span>
            <Expire
              disabled={!shareInfo?.enabled || normalizationFailed}
              expiresAt={shareInfo ? shareInfo.expires_at : null}
              onNeverSelected={() => handleExpireDateChange(null)}
              onDateSelected={handleExpireDateChange}
              onCountdownSelected={handleExpireCountdownChange}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm">{t('share.share.ai_chat')}</span>
            <ShareTypeSelector
              disabled={!shareInfo?.enabled || normalizationFailed}
              shareType={shareInfo?.share_type || 'doc_only'}
              onChange={handleShareTypeChange}
            />
          </div>
          <div className="flex items-center gap-2 justify-between mt-4 h-6">
            <span className="text-sm">{t('share.share.password')}</span>
            <Password
              disabled={!shareInfo?.enabled || normalizationFailed}
              passwordEnabled={!!shareInfo?.password_enabled}
              onSave={handlePasswordChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
