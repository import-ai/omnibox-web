import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExtraProps } from 'react-markdown';
import { useParams } from 'react-router-dom';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { trackButtonClick } from '@/lib/trackButtonClick';
import { useShareChatOnly } from '@/page/share/ShareChatOnlyContext';

import { resolveChatImageUrl } from './chatImageUrl';
import { getMarkdownImageGallery } from './markdownImageGallery';

export function ChatMarkdownImage({
  src,
  alt,
  node,
}: {
  src?: string;
  alt?: string;
} & ExtraProps) {
  const { t } = useTranslation();
  const { share_id: shareId } = useParams();
  const chatOnly = useShareChatOnly();
  const url = resolveChatImageUrl(src, shareId);
  const [failedUrl, setFailedUrl] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const invokerRef = useRef<HTMLButtonElement | null>(null);

  if (chatOnly) return null;
  if (!url || failedUrl === url) {
    return (
      <span className="text-sm text-muted-foreground" role="status">
        {t('chat.image.load_failed')}
        {alt ? ` (${alt})` : ''}
      </span>
    );
  }

  const group =
    previewUrl === url && !chatOnly ? getMarkdownImageGallery(node) : undefined;
  const gallery = group?.images.flatMap((entry, index) => {
    const source = entry.properties.src;
    const src =
      typeof source === 'string'
        ? resolveChatImageUrl(source, shareId)
        : undefined;
    if (!src) return [];
    return [
      {
        id: String(index),
        src,
        alt:
          typeof entry.properties.alt === 'string'
            ? entry.properties.alt
            : undefined,
        referrerPolicy: 'no-referrer' as const,
        allowExternalOriginal: !shareId,
      },
    ];
  });
  return (
    <>
      <button
        type="button"
        aria-label={t('chat.image.preview')}
        className="max-w-full cursor-zoom-in rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={event => {
          trackButtonClick('chat_image_open');
          const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            invokerRef.current = event.currentTarget;
            setPreviewUrl(url);
          };
          if (typeof handleClick === 'function') {
            (handleClick as (value?: typeof event) => void)(event);
          }
        }}
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
        items={gallery}
        initialItemId={group ? String(group.index) : undefined}
        allowExternalOriginal={!shareId}
        src={url}
        referrerPolicy="no-referrer"
        invokerRef={invokerRef}
        open={previewUrl === url}
        onOpenChange={open => setPreviewUrl(open ? url : undefined)}
      />
    </>
  );
}
