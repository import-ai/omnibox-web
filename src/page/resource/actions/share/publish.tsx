import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ShareInfo } from '@/interface';
import { http } from '@/lib/request';
import { t } from 'i18next';
import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

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

  const shareUrl = shareInfo?.enabled
    ? `${location.origin}/s/${shareInfo.id}`
    : '';

  const handleEnable = (enabled: boolean) => {
    http
      .patch(`namespaces/${namespace_id}/resources/${resource_id}/share`, {
        enabled,
      })
      .then((data) => {
        setShareInfo(data);
      });
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div>
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
    </div>
  );
}
