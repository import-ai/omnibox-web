import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize,
  MessageSquare,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type ReactElement, type ReactNode, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  ImageViewerCommentAction,
  ImageViewerItem,
} from './ImagePreviewDialog';
import { externalImageLink } from './imageViewerActions';
import {
  type getImageViewerLayout,
  stepImageViewerZoom,
} from './imageViewerGeometry';
import { ImageViewerHint } from './ImageViewerHint';
import { ActualSizeIcon, RotateImageIcon } from './ImageViewerIcons';

export interface ImageViewerNavigation {
  index: number;
  length: number;
  move: (delta: number) => void;
}

const actionClass =
  'inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent [&_svg]:size-4';

export function ImageViewerToolbar({
  item,
  layout,
  comment,
  navigation,
  setView,
  onRotate,
  onOpenChange,
}: {
  item: ImageViewerItem;
  layout?: ReturnType<typeof getImageViewerLayout>;
  comment?: ImageViewerCommentAction;
  navigation?: ImageViewerNavigation;
  setView: (zoom: number | null) => void;
  onRotate: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const commentsId = useId();
  const [downloadStatus, setDownloadStatus] = useState<'busy' | 'error'>();
  const [commentOpen, setCommentOpen] = useState(false);

  const zoomIn = layout
    ? stepImageViewerZoom(layout.scale, layout.fit, 1)
    : null;
  const zoomOut = layout
    ? stepImageViewerZoom(layout.scale, layout.fit, -1)
    : null;
  const percent = new Intl.NumberFormat(
    i18n?.resolvedLanguage ?? i18n?.language,
    {
      style: 'percent',
      maximumSignificantDigits: 3,
    }
  );
  const zoomRatio = layout ? percent.format(layout.scale) : '—';
  const dismiss = () => onOpenChange(false);
  const hint = (key: string, child: ReactElement) => (
    <ImageViewerHint label={t(`image_viewer.${key}`)} onEscape={dismiss}>
      {child}
    </ImageViewerHint>
  );
  const action = (
    name: string,
    content: ReactNode,
    onClick: () => void,
    disabledReason?: string
  ) => (
    <ImageViewerHint
      label={t(`image_viewer.${disabledReason ?? name}`)}
      onEscape={dismiss}
    >
      <button
        type="button"
        data-image-viewer-nav={
          name === 'previous' || name === 'next' ? name : undefined
        }
        aria-label={t(`image_viewer.${name}`)}
        className={actionClass}
        aria-disabled={!!disabledReason}
        onClick={event => {
          if (disabledReason) {
            event.preventDefault();
            return;
          }
          onClick();
        }}
      >
        {content}
      </button>
    </ImageViewerHint>
  );
  const original =
    !item.download && item.allowExternalOriginal
      ? externalImageLink(item.src)
      : undefined;

  return (
    <div className="relative shrink-0 py-2">
      <div
        role="group"
        aria-label={t('image_viewer.controls')}
        className="mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-wrap items-center justify-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-sm"
      >
        {navigation && (
          <>
            {action(
              'previous',
              <ChevronLeft />,
              () => navigation.move(-1),
              navigation.index === 0 ? 'first_image' : undefined
            )}
            <output aria-live="polite" className="tabular-nums">
              {navigation.index + 1}/{navigation.length}
            </output>
            {action(
              'next',
              <ChevronRight />,
              () => navigation.move(1),
              navigation.index === navigation.length - 1
                ? 'last_image'
                : undefined
            )}
          </>
        )}
        {action(
          'zoom_out',
          <ZoomOut />,
          () => zoomOut !== null && setView(zoomOut),
          zoomOut === null
            ? layout
              ? 'min_zoom'
              : 'zoom_unavailable'
            : undefined
        )}
        <output className="min-w-9 text-center tabular-nums">
          {zoomRatio}
        </output>
        {action(
          'zoom_in',
          <ZoomIn />,
          () => zoomIn !== null && setView(zoomIn),
          zoomIn === null
            ? layout
              ? 'max_zoom'
              : 'zoom_unavailable'
            : undefined
        )}
        {action(
          'actual_size',
          <ActualSizeIcon />,
          () => setView(1),
          layout ? undefined : 'zoom_unavailable'
        )}
        {action(
          'fit',
          <Maximize />,
          () => setView(null),
          layout ? undefined : 'zoom_unavailable'
        )}
        {action(
          'rotate',
          <RotateImageIcon />,
          onRotate,
          layout ? undefined : 'rotate_unavailable'
        )}
        {item.download &&
          ('href' in item.download
            ? hint(
                'download',
                <a
                  href={item.download.href}
                  download={item.download.name}
                  className={actionClass}
                  aria-label={t('image_viewer.download')}
                >
                  <Download />
                </a>
              )
            : action(
                'download',
                <Download />,
                () => {
                  const request = item.download;
                  if (!request || !('run' in request)) return;
                  setDownloadStatus('busy');
                  void request.run().then(
                    () => setDownloadStatus(undefined),
                    () => setDownloadStatus('error')
                  );
                },
                downloadStatus === 'busy' ? 'download_in_progress' : undefined
              ))}
        {original &&
          hint(
            'open_original',
            <a
              href={original}
              target="_blank"
              rel="noopener noreferrer"
              className={actionClass}
              aria-label={t('image_viewer.open_original')}
            >
              <ExternalLink />
            </a>
          )}
        {comment &&
          hint(
            'comments',
            <button
              type="button"
              className={actionClass}
              aria-label={t('image_viewer.comments')}
              aria-expanded={commentOpen}
              aria-controls={commentsId}
              onClick={() => setCommentOpen(!commentOpen)}
            >
              <MessageSquare />
              {comment.count}
            </button>
          )}
      </div>
      {downloadStatus === 'error' && (
        <p role="status" className="text-center text-sm">
          {t('image_viewer.download_failed')}
        </p>
      )}
      {comment && commentOpen && (
        <div
          id={commentsId}
          className="absolute right-2 bottom-full max-h-[45vh] w-72 max-w-[calc(100%-1rem)] overflow-auto rounded-md bg-neutral-900 p-2 text-sm"
        >
          {comment.threads?.map(thread => (
            <button
              key={thread.id}
              type="button"
              className={`${actionClass} block w-full truncate text-left`}
              onClick={() => {
                if (comment.onOpen(thread.id) !== false) onOpenChange(false);
              }}
            >
              {thread.label}
            </button>
          ))}
          {comment.canAdd && (
            <button
              type="button"
              className={actionClass}
              onClick={() => {
                if (comment.onOpen() !== false) onOpenChange(false);
              }}
            >
              {t('resource_comments.add_comment')}
            </button>
          )}
          {comment.needsSave && (
            <p className="px-2 py-1">{t('image_viewer.save_to_comment')}</p>
          )}
        </div>
      )}
    </div>
  );
}
