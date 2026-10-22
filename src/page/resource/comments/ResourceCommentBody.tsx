import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import type { ResourceCommentAttachment } from '@/interface';
import {
  hasMentionCard,
  type MentionCardMember,
} from '@/page/resource/mentionCard';
import { MentionHoverCard } from '@/page/resource/MentionHoverCard';

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
  membersById,
}: {
  content: string;
  attachments?: ResourceCommentAttachment[];
  mentionUsers?: CommentMentionUser[];
  membersById?: Record<string, MentionCardMember>;
}) {
  const directory = useCommentMentionUsers();
  const users = mentionUsers ?? directory.users;
  const cards = membersById ?? directory.membersById;
  const liveNames = Object.fromEntries(users.map(user => [user.id, user.name]));
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
                    label={commentMentionLabel(part.id, part.label, liveNames)}
                    member={cards[part.id]}
                    active={commentMentionActive(part.id, liveNames)}
                  />
                )
              )
            : content}
        </p>
      ) : null}
      <MentionHoverCard containerRef={textRef} membersById={cards} />
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
  member,
  active,
}: {
  id: string;
  label: string;
  member?: MentionCardMember;
  active: boolean;
}) {
  const text = `@${label}`;
  const hover = active && !!member && hasMentionCard(member);
  return (
    <span
      className="omnibox-comment-mention"
      data-mention-id={id}
      data-type={hover ? 'mention' : undefined}
      data-id={hover ? id : undefined}
      data-mention-active={hover ? '' : undefined}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      {text}
    </span>
  );
}
