import { ResourceCommentComposer as EditorCommentComposer } from '@import-ai/omnibox-editor';
import { useTranslation } from 'react-i18next';

import type { ResourceCommentsController } from './useResourceComments';

interface ResourceCommentComposerProps {
  controller: ResourceCommentsController;
}

export function ResourceCommentComposer({
  controller,
}: ResourceCommentComposerProps) {
  const { t } = useTranslation();

  return (
    <EditorCommentComposer
      selection={controller.pendingSelection}
      submitting={controller.submitting}
      error={
        controller.createConflict
          ? t('resource_comments.content_conflict')
          : null
      }
      labels={{
        cancel: t('resource_comments.cancel'),
        dialog: t('resource_comments.write_comment'),
        placeholder: t('resource_comments.write_comment'),
        submit: t('resource_comments.comment'),
      }}
      onCancel={() => {
        controller.setPendingSelection(null);
        controller.setCreateConflict(false);
      }}
      onSubmit={async content => {
        await controller.createThread(content);
      }}
    />
  );
}
