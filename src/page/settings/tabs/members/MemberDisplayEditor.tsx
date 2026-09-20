import { Pencil } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { Textarea } from '@/components/ui/Textarea';
import { Member } from '@/interface';
import { http } from '@/lib/request';

import {
  MEMBER_NICKNAME_MAX_LENGTH,
  MEMBER_NOTE_MAX_LENGTH,
} from './memberDisplay';

interface MemberDisplayEditorProps {
  member: Member;
  namespaceId: string;
  canEditNickname: boolean;
  refetch: () => void;
}

export function focusEditorFieldAtEnd(event: Event) {
  event.preventDefault();
  const field = (event.currentTarget as HTMLElement | null)?.querySelector(
    'input, textarea'
  ) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!field) {
    return;
  }
  field.focus();
  const length = field.value.length;
  field.setSelectionRange(length, length);
}

export default function MemberDisplayEditor(props: MemberDisplayEditorProps) {
  const { member, namespaceId, canEditNickname, refetch } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState(member.nickname || '');
  const [note, setNote] = useState(member.note || '');
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const ignoreTooltipRef = useRef(false);
  const tooltipLabel = canEditNickname
    ? t('manage.nickname')
    : t('manage.note');

  const handlePopoverOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setTooltipOpen(false);
    ignoreTooltipRef.current = true;
  };

  const releaseTooltip = () => {
    ignoreTooltipRef.current = false;
  };
  useEffect(() => {
    if (!open) {
      return;
    }
    setNickname(member.nickname || '');
    setNote(member.note || '');
  }, [member.nickname, member.note, open]);

  const handleSave = async () => {
    const payload: { nickname?: string | null; note?: string | null } =
      canEditNickname
        ? {
            nickname:
              nickname.trim().slice(0, MEMBER_NICKNAME_MAX_LENGTH) || null,
          }
        : { note: note.trim().slice(0, MEMBER_NOTE_MAX_LENGTH) || null };

    setSaving(true);
    try {
      await http.patch(
        `/namespaces/${namespaceId}/members/${member.user_id}/profile`,
        payload
      );
      handlePopoverOpenChange(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const isComposingKey = (event: KeyboardEvent) =>
    event.nativeEvent.isComposing || event.keyCode === 229;

  const handleEditorKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handlePopoverOpenChange(false);
      return;
    }
    if (event.key !== 'Enter' || isComposingKey(event) || saving) {
      return;
    }
    if (event.shiftKey) {
      if (event.currentTarget instanceof HTMLInputElement) {
        event.preventDefault();
      }
      return;
    }
    event.preventDefault();
    void handleSave();
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Popover open={open} onOpenChange={handlePopoverOpenChange}>
        <Tooltip
          open={!open && tooltipOpen}
          onOpenChange={nextOpen => {
            if (nextOpen && ignoreTooltipRef.current) {
              return;
            }
            setTooltipOpen(nextOpen);
          }}
        >
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-100 hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
                aria-label={tooltipLabel}
                onPointerEnter={releaseTooltip}
                onPointerLeave={() => {
                  ignoreTooltipRef.current = false;
                  setTooltipOpen(false);
                }}
              >
                <Pencil className="size-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltipLabel}</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          className="w-72 space-y-3 p-3"
          onOpenAutoFocus={focusEditorFieldAtEnd}
          onCloseAutoFocus={event => event.preventDefault()}
        >
          {canEditNickname ? (
            <div className="space-y-1.5">
              <Label htmlFor={`member-nickname-${member.user_id}`}>
                {t('manage.nickname')}
              </Label>
              <Input
                id={`member-nickname-${member.user_id}`}
                value={nickname}
                maxLength={MEMBER_NICKNAME_MAX_LENGTH}
                placeholder={t('manage.nickname_placeholder')}
                onChange={event => setNickname(event.target.value)}
                onKeyDown={handleEditorKeyDown}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('manage.nickname_visible_hint')}</span>
                <span>
                  {nickname.length}/{MEMBER_NICKNAME_MAX_LENGTH}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor={`member-note-${member.user_id}`}>
                {t('manage.note')}
              </Label>
              <Textarea
                id={`member-note-${member.user_id}`}
                value={note}
                maxLength={MEMBER_NOTE_MAX_LENGTH}
                placeholder={t('manage.note_placeholder')}
                className="min-h-[72px]"
                onChange={event => setNote(event.target.value)}
                onKeyDown={handleEditorKeyDown}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('manage.note_private_hint')}</span>
                <span>
                  {note.length}/{MEMBER_NOTE_MAX_LENGTH}
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-8"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {t('manage.submit')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
