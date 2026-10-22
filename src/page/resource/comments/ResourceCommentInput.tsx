import { Image, X } from 'lucide-react';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from '@/components/autosize-textarea';

import { pasteCommentImage } from './pasteCommentImage';
import { ResourceCommentDraftImage } from './ResourceCommentDraftImage';
import type { useCommentDraft } from './useCommentDraft';

export function ResourceCommentInput({
  draft,
  disabled,
  inputRef,
  onSubmit,
}: {
  draft: Pick<
    ReturnType<typeof useCommentDraft>,
    | 'content'
    | 'setContent'
    | 'imagePreview'
    | 'uploading'
    | 'clearImage'
    | 'uploadImage'
  >;
  disabled: boolean;
  inputRef?: Ref<AutosizeTextAreaRef>;
  onSubmit: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={'omnibox-comment-composer__input'}
      data-has-preview={draft.imagePreview ? '' : undefined}
    >
      <AutosizeTextarea
        ref={inputRef}
        className={'border-line'}
        minHeight={0}
        maxHeight={160}
        maxLength={10000}
        placeholder={t('resource_comments.write_comment')}
        rows={1}
        value={draft.content}
        disabled={disabled}
        aria-busy={draft.uploading}
        onChange={event => draft.setContent(event.target.value)}
        onPaste={event => pasteCommentImage(event, draft.uploadImage)}
        onKeyDown={event => {
          if (
            event.key !== 'Enter' ||
            event.nativeEvent.isComposing ||
            event.shiftKey
          )
            return;
          event.preventDefault();
          if (!event.repeat) onSubmit().catch(() => undefined);
        }}
      />
      {draft.imagePreview ? (
        <div className={'omnibox-comment-composer__preview'}>
          <ResourceCommentDraftImage
            key={draft.imagePreview}
            src={draft.imagePreview}
          />
          <button
            type={'button'}
            className={'omnibox-comment-image-remove'}
            disabled={disabled}
            aria-label={t('resource_comments.remove_image')}
            title={t('resource_comments.remove_image')}
            onClick={draft.clearImage}
          >
            <X aria-hidden strokeWidth={2} />
          </button>
        </div>
      ) : null}
      <label
        className={'omnibox-comment-composer__attach'}
        aria-label={t('resource_comments.attach_image')}
        title={t('resource_comments.attach_image')}
      >
        <input
          type={'file'}
          accept={'image/*'}
          className={'sr-only'}
          disabled={disabled}
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void draft.uploadImage(file);
          }}
        />
        <Image aria-hidden className={'size-4'} strokeWidth={1.5} />
      </label>
    </div>
  );
}
