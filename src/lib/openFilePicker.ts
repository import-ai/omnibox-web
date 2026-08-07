import { toast } from 'sonner';

import i18n from '@/i18n';

const pickerOpenDetectionDelay = 1000;

function showFilePickerUnavailableToast() {
  toast.warning(i18n.t('upload.file_picker_unavailable'), {
    description: i18n.t('upload.file_picker_recovery'),
  });
}

export function openFilePicker(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  let detectedOpen = false;
  let detectionTimer: number | undefined;

  const cleanup = () => {
    window.clearTimeout(detectionTimer);
    window.removeEventListener('blur', markAsOpened);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    input.removeEventListener('change', markAsOpened);
    input.removeEventListener('cancel', markAsOpened);
  };

  const markAsOpened = () => {
    detectedOpen = true;
    cleanup();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      markAsOpened();
    }
  };

  window.addEventListener('blur', markAsOpened);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  input.addEventListener('change', markAsOpened);
  input.addEventListener('cancel', markAsOpened);

  try {
    input.click();
  } catch {
    cleanup();
    showFilePickerUnavailableToast();
    return;
  }

  detectionTimer = window.setTimeout(() => {
    cleanup();
    if (!detectedOpen && document.hasFocus()) {
      showFilePickerUnavailableToast();
    }
  }, pickerOpenDetectionDelay);
}
