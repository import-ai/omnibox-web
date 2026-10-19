import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';
import type { ResourceCommentAttachment } from '@/interface';

import {
  commentMentionActive,
  commentMentionLabel,
  type CommentMentionUser,
  splitCommentContent,
} from './commentMentions';
import { useCommentMentionUsers } from './useCommentMentionUsers';

export function ResourceCommentBody({
  content,
  attachments,
  mentionUsers,
}: {
  content: string;
  attachments?: ResourceCommentAttachment[];
  mentionUsers?: CommentMentionUser[];
}) {
  const directory = useCommentMentionUsers();
  const users = mentionUsers ?? directory;
  const namesById = Object.fromEntries(users.map(user => [user.id, user.name]));
  const detailById = Object.fromEntries(
    users.map(user => [user.id, user.position])
  );
  const parts = splitCommentContent(content);
  const hasMention = parts.some(part => part.type === 'user');
  const { t } = useTranslation();
  const contentId = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [preview, setPreview] = useState<ResourceCommentAttachment | null>(
    null
  );
  const invokerRef = useRef<HTMLButtonElement | null>(null);
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
          {hasMention
            ? parts.map((part, index) =>
                part.type === 'text' ? (
                  part.text
                ) : (
                  <CommentMention
                    key={`${part.id}:${index}`}
                    id={part.id}
                    label={commentMentionLabel(part.id, part.label, namesById)}
                    detail={detailById[part.id]}
                    active={commentMentionActive(part.id, namesById)}
                  />
                )
              )
            : content}
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
          aria-label={t('chat.image.preview')}
          className="omnibox-comment-message__image-button"
          onClick={event => {
            event.stopPropagation();
            invokerRef.current = event.currentTarget;
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
      <ImagePreviewDialog
        alt={preview?.name}
        open={!!preview}
        src={preview?.url}
        invokerRef={invokerRef}
        onOpenChange={open => {
          if (!open) setPreview(null);
        }}
      />
    </div>
  );
}

function CommentMention({
  id,
  label,
  detail,
  active,
}: {
  id: string;
  label: string;
  detail?: string;
  active: boolean;
}) {
  const text = `@${label}`;
  if (!active) {
    return (
      <span className="omnibox-comment-mention" data-mention-id={id}>
        {text}
      </span>
    );
  }
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span
          className="omnibox-comment-mention"
          data-mention-id={id}
          data-mention-active=""
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          {text}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-56 p-3"
        onClick={event => event.stopPropagation()}
      >
        <span className="block text-sm font-medium">{label}</span>
        {detail ? (
          <span className="mt-1 block text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
