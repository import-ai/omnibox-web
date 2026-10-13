import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import type { ResourceCommentAttachment } from '@/interface';

export function ResourceCommentBody({
  content,
  attachments,
}: {
  content: string;
  attachments?: ResourceCommentAttachment[];
}) {
  const { t } = useTranslation();
  const contentId = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [preview, setPreview] = useState<ResourceCommentAttachment | null>(
    null
  );
  const images = (attachments ?? []).filter(item =>
    item.mimetype.startsWith('image/')
  );

  useLayoutEffect(() => {
    setExpanded(false);
    const text = textRef.current;
    if (!text) {
      setOverflowing(false);
      return;
    }
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
      const overflows = text.scrollHeight > Math.ceil(lineHeight * 16);
      setOverflowing(overflows);
      if (!overflows) {
        setExpanded(false);
      }
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(text);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [content]);

  return (
    <div className="omnibox-comment-message__content">
      {content.trim() ? (
        <p
          ref={textRef}
          id={contentId}
          className="omnibox-comment-message__text"
          data-expanded={expanded || undefined}
        >
          {content}
        </p>
      ) : null}
      {overflowing ? (
        <button
          type="button"
          className="omnibox-comment-message__toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={event => {
            event.stopPropagation();
            setExpanded(current => !current);
          }}
        >
          {t(
            expanded
              ? 'resource_comments.collapse_content'
              : 'resource_comments.expand_content'
          )}
        </button>
      ) : null}
      {images.map(image => (
        <button
          key={image.id}
          type="button"
          className="omnibox-comment-message__image-button"
          onClick={event => {
            event.stopPropagation();
            setPreview(image);
          }}
        >
          <img
            src={image.url}
            alt={image.name}
            className="omnibox-comment-message__image"
          />
        </button>
      ))}
      <Dialog
        open={!!preview}
        onOpenChange={open => {
          if (!open) {
            setPreview(null);
          }
        }}
      >
        <DialogContent
          className="omnibox-comment-image-preview max-w-[min(90vw,56rem)] border-0 bg-transparent p-0 shadow-none outline-none"
          onClick={event => event.stopPropagation()}
        >
          <DialogTitle className="sr-only">
            {preview?.name || t('resource_comments.preview_image')}
          </DialogTitle>
          {preview ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[85vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
