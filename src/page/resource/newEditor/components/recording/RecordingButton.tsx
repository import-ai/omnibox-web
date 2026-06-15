import type { Editor } from '@tiptap/react';
import { Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import {
  type EditorAttachmentContext,
  getUploadedAttachmentHref,
  uploadAndInsertAttachments,
} from '../attachments/attachmentUpload';
import { validateEditorAttachments } from '../attachments/attachmentValidation';
import { getToolbarLabel } from '../shortcutLabels';
import {
  hasUsableAudioDuration,
  probeAudioBlob,
  probeAudioSource,
  reportRecordingDiagnostic,
} from './audioDiagnostics';
import {
  createWavRecorderAudioContext,
  hasRecordedAudio,
  WAV_AUDIO_MIME_TYPE,
  WavRecorder,
} from './wavRecorder';

const iconClassName = 'size-4';

interface RecordingButtonProps {
  context: EditorAttachmentContext;
  disabled?: boolean;
  editor: Editor;
  label: string;
  onRecordingChange?: (recording: boolean) => void;
}

function RecordingButton(props: RecordingButtonProps) {
  const { context, disabled, editor, label, onRecordingChange } = props;
  const { t } = useTranslation();
  const recorderRef = useRef<WavRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateRecording = (nextRecording: boolean) => {
    setRecording(nextRecording);
    onRecordingChange?.(nextRecording);
  };

  useEffect(() => {
    return () => {
      recorderRef.current?.close();
      recorderRef.current = null;
      onRecordingChange?.(false);
    };
  }, [onRecordingChange]);

  const startRecording = async () => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    try {
      audioContext = createWavRecorderAudioContext();

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new WavRecorder(stream, audioContext);
      audioContext = null;

      await recorder.start();
      recorderRef.current = recorder;
      updateRecording(true);
    } catch {
      audioContext?.close();
      stream?.getTracks().forEach(track => track.stop());
      toast.error(t('resource.editor.record.permission_denied'), {
        position: 'bottom-right',
      });
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;

    if (!recorder) {
      return;
    }

    let blob: Blob;

    try {
      blob = await recorder.stop();
    } catch {
      recorder.close();
      recorderRef.current = null;
      updateRecording(false);
      toast.error(t('resource.editor.record.empty'), {
        position: 'bottom-right',
      });
      return;
    }

    recorder.close();
    recorderRef.current = null;
    updateRecording(false);

    const localProbe = await probeAudioBlob(blob);

    reportRecordingDiagnostic('local_blob', localProbe);

    if (
      !hasRecordedAudio(blob) ||
      (localProbe.canProbe &&
        (!localProbe.duration || !hasUsableAudioDuration(localProbe.duration)))
    ) {
      toast.error(t('resource.editor.record.empty'), {
        position: 'bottom-right',
      });
      return;
    }

    const file = new File([blob], `record${Date.now()}.wav`, {
      type: WAV_AUDIO_MIME_TYPE,
    });
    const validationError = validateEditorAttachments([file]);

    if (validationError) {
      toast.error(t(`upload.${validationError}`), { position: 'bottom-right' });
      return;
    }

    setUploading(true);

    try {
      const response = await uploadAndInsertAttachments(
        editor,
        [file],
        context
      );
      const uploadedAudio = response?.uploaded.find(
        uploadedFile => uploadedFile.name === file.name
      );

      if (uploadedAudio) {
        const remoteProbe = await probeAudioSource(
          getUploadedAttachmentHref(uploadedAudio)
        );
        reportRecordingDiagnostic('uploaded_attachment', remoteProbe);
      }
    } catch {
      toast.error(t('upload.failed'), { position: 'bottom-right' });
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (uploading) {
      return;
    }

    if (recording) {
      void stopRecording();
      return;
    }

    void startRecording();
  };

  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={uploading || (!recording && disabled)}
      onMouseDown={event => event.preventDefault()}
      onClick={handleClick}
      className={[
        'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
        'hover:bg-slate-200 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:pointer-events-none disabled:text-slate-300',
        'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
        recording
          ? 'bg-slate-200 text-slate-950 dark:bg-neutral-800 dark:text-white'
          : '',
      ].join(' ')}
    >
      <Mic className={iconClassName} />
    </button>
  );

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {uploading || (!recording && disabled) ? (
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
      <TooltipContent side="top">
        {getToolbarLabel(recording ? t('resource.editor.record.stop') : label)}
      </TooltipContent>
    </Tooltip>
  );
}

export default RecordingButton;
