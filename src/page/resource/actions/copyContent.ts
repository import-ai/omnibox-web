import copy from 'copy-to-clipboard';
import { toast } from 'sonner';

import { copyBodyMarkdown } from './copyBodyMarkdown';

type TranslateCopyContent = (
  key:
    'actions.copy_content_success' | 'actions.no_content_to_copy' | 'copy.fail'
) => string;

export async function copyContentToClipboard(
  markdown: string | null | undefined,
  t: TranslateCopyContent
): Promise<void> {
  if (!markdown) {
    toast.error(t('actions.no_content_to_copy'), {
      position: 'bottom-right',
    });
    return;
  }

  let text: string;
  try {
    text = copyBodyMarkdown(markdown);
  } catch {
    toast.error(t('copy.fail'), { position: 'bottom-right' });
    return;
  }
  if (!text) {
    toast.error(t('actions.no_content_to_copy'), {
      position: 'bottom-right',
    });
    return;
  }

  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    // fall through
  }
  if (!ok) {
    try {
      ok = copy(text, {
        format: 'text/plain',
        onCopy: (clipboardData: any) => {
          try {
            clipboardData?.setData('text/plain', text);
            clipboardData?.setData('text/html', '');
          } catch {
            // ignore
          }
        },
      });
    } catch {
      ok = false;
    }
  }
  if (ok) {
    toast.success(t('actions.copy_content_success'), {
      position: 'bottom-right',
    });
  } else {
    toast.error(t('copy.fail'), { position: 'bottom-right' });
  }
}
