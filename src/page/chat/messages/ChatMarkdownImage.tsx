import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ImagePreviewDialog } from '@/page/chat/ImagePreviewDialog';
import { useShareChatOnly } from '@/page/share/ShareChatOnlyContext';

import { resolveChatImageUrl } from './chatImageUrl';

export function ChatMarkdownImage({
  src,
  alt,
}: {
  src?: string;
  alt?: string;
}) {
  const { t } = useTranslation();
  const { share_id: shareId } = useParams();
  const chatOnly = useShareChatOnly();
  const url = resolveChatImageUrl(src, shareId, chatOnly);
  const [failedUrl, setFailedUrl] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();

  if (chatOnly) return alt || null;
  if (!url || failedUrl === url) {
    return (
      <span className="text-sm text-muted-foreground" role="status">
        {t('chat.image.load_failed')}
        {alt ? ` (${alt})` : ''}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('chat.image.preview')}
        className="max-w-full cursor-zoom-in rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => setPreviewUrl(url)}
      >
        <img
          src={url}
          alt={alt || t('chat.image.preview')}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="max-h-96 max-w-full rounded-md object-contain"
          onError={() => setFailedUrl(url)}
        />
      </button>
      <ImagePreviewDialog
        alt={alt}
        src={url}
        open={previewUrl === url}
        onOpenChange={open => setPreviewUrl(open ? url : undefined)}
      />
    </>
  );
}
