import type { Editor } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import { getToolbarLabel } from '../shortcutLabels';
import {
  type EditorAttachmentContext,
  uploadAndInsertAttachments,
} from './attachmentUpload';
import { validateEditorAttachments } from './attachmentValidation';

const iconClassName = 'size-4';

interface AttachmentUploadButtonProps {
  accept?: string;
  context: EditorAttachmentContext;
  disabled?: boolean;
  editor: Editor;
  icon: LucideIcon;
  label: string;
}

function AttachmentUploadButton(props: AttachmentUploadButtonProps) {
  const { accept, context, disabled, editor, icon: Icon, label } = props;
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const validationError = validateEditorAttachments(files);

    if (validationError) {
      toast.error(t(`upload.${validationError}`), { position: 'bottom-right' });

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      return;
    }

    setUploading(true);

    try {
      await uploadAndInsertAttachments(editor, files, context);
    } catch {
      toast.error(t('upload.failed'), { position: 'bottom-right' });
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled || uploading}
      onMouseDown={event => event.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className={[
        'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
        'hover:bg-slate-200 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:pointer-events-none disabled:text-slate-300',
        'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
      ].join(' ')}
    >
      <Icon className={iconClassName} />
    </button>
  );

  return (
    <>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {disabled || uploading ? (
            <span
              className={[
                'inline-flex',
                uploading ? 'cursor-wait' : 'cursor-not-allowed',
              ].join(' ')}
            >
              {button}
            </span>
          ) : (
            button
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{getToolbarLabel(label)}</TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={event => handleFiles(event.target.files)}
      />
    </>
  );
}

export default AttachmentUploadButton;
