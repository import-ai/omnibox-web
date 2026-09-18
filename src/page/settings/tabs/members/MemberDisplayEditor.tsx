import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function MemberDisplayEditor(props: MemberDisplayEditorProps) {
  const { member, namespaceId, canEditNickname, refetch } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState(member.nickname || '');
  const [note, setNote] = useState(member.note || '');
  const tooltipLabel = canEditNickname
    ? t('manage.nickname')
    : t('manage.note');

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
      setOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-100 hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
                aria-label={tooltipLabel}
              >
                <Pencil className="size-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltipLabel}</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-72 space-y-3 p-3">
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
