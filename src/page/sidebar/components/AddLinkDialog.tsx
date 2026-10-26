import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { prepareCollectUrl } from '@/page/chat/home/addLink';

interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string) => Promise<unknown>;
}

export function AddLinkDialog({
  open,
  onOpenChange,
  onConfirm,
}: AddLinkDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(true);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveDisabled = !url.trim() || submitting;
  const showEllipsis = url.length > 0 && !focused && !hovered;

  useEffect(() => {
    if (open) {
      setUrl('');
      setFocused(true);
      setHovered(false);
    }
  }, [open]);

  useEffect(() => {
    if (showEllipsis) {
      inputRef.current && (inputRef.current.scrollLeft = 0);
    }
  }, [showEllipsis]);

  const handleConfirm = async () => {
    const prepared = prepareCollectUrl(url);
    if (!('url' in prepared) || submitting) {
      if (!('url' in prepared)) {
        toast.error(
          t(
            prepared.error === 'self'
              ? 'chat.home.upload.self_link'
              : 'chat.home.upload.invalid_link'
          )
        );
      }
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(prepared.url);
      setUrl('');
      onOpenChange(false);
    } catch {
      // Keep dialog open when request fails.
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;
    setUrl('');
    onOpenChange(false);
  };

  const handleClear = () => {
    setUrl('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && submitting) return;
        onOpenChange(nextOpen);
        if (!nextOpen) setUrl('');
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('link.create_dialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Input
              ref={inputRef}
              id="add-link-url"
              name="omnibox-add-link"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={url}
              onChange={event => setUrl(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={t('link.create_dialog.placeholder')}
              placeholder={t('link.create_dialog.placeholder')}
              className={cn(
                'border-line whitespace-nowrap shadow-none focus-visible:border-line focus-visible:ring-0 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]',
                url.length > 0 && 'pr-9'
              )}
              style={{
                overflow: 'hidden',
                textOverflow: showEllipsis ? 'ellipsis' : 'clip',
              }}
              autoFocus
              disabled={submitting}
              onFocus={() => setFocused(true)}
              onBlur={event => {
                setFocused(false);
                event.currentTarget.scrollLeft = 0;
              }}
            />
            {url.length > 0 && (
              <span className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="button"
                  aria-label={t('delete')}
                  className="inline-flex size-4 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  disabled={submitting}
                  onClick={handleClear}
                >
                  <X className="size-4" />
                </button>
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <span className={cn(saveDisabled && 'cursor-not-allowed')}>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={saveDisabled}
              loading={submitting}
            >
              {t('chat.home.upload.save')}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
