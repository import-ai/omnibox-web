import copy from 'copy-to-clipboard';
import { toast } from 'sonner';

type TranslateCopyContent = (
  key:
    'actions.copy_content_success' | 'actions.no_content_to_copy' | 'copy.fail'
) => string;

export async function copyContentToClipboard(
  markdown: string | null | undefined,
  t: TranslateCopyContent
): Promise<void> {
  if (!markdown) {
    toast(t('actions.no_content_to_copy'), {
      position: 'bottom-right',
    });
    return;
  }

  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
      ok = true;
    }
  } catch {
    // fall through
  }
  if (!ok) {
    ok = copy(markdown, {
      format: 'text/plain',
      onCopy: (clipboardData: any) => {
        try {
          clipboardData?.setData('text/plain', markdown);
          clipboardData?.setData('text/html', '');
        } catch {
          // ignore
        }
      },
    });
  }
  toast(t(ok ? 'actions.copy_content_success' : 'copy.fail'), {
    position: 'bottom-right',
  });
}
