import { Loader2, Plus } from 'lucide-react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/Button';
import MultipleSelector, { Option } from '@/components/multiple-selector';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import { Popover, PopoverAnchor } from '@/components/ui/Popover';
import { Member } from '@/interface';
import isEmail from '@/lib/isEmail';
import { http } from '@/lib/request';

import { memberRecipientLabel } from './memberDisplay';

const memberOptionListClassName = [
  'max-h-[min(18rem,max(0px,calc(var(--radix-popper-available-height)-4.25rem)))]',
  'scrollbar-thin-visible overscroll-contain pr-1',
].join(' ');

function keepMemberListScroll(event: WheelEvent) {
  const content = event.currentTarget;
  if (!(content instanceof HTMLElement) || !event.deltaY) {
    return;
  }
  const list = content.querySelector('[data-slot="command-list"]');
  if (
    !(list instanceof HTMLElement) ||
    !(event.target instanceof Node) ||
    !list.contains(event.target)
  ) {
    return;
  }
  const atStart = list.scrollTop <= 0;
  const atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
  const scrollingDown = event.deltaY > 0;
  if ((scrollingDown && !atEnd) || (!scrollingDown && !atStart)) {
    event.stopPropagation();
  }
}

interface AddMemberProps {
  group_id: string;
  namespace_id: string;
  data: Array<Member>;
  refetch: () => void;
}

export default function AddMember(props: AddMemberProps) {
  const { data, namespace_id, group_id, refetch } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const setContent = useCallback((node: HTMLElement | null) => {
    setContentEl(current => (current === node ? current : node));
  }, []);
  useEffect(() => {
    if (!contentEl) {
      return;
    }
    contentEl.addEventListener('wheel', keepMemberListScroll);
    return () => contentEl.removeEventListener('wheel', keepMemberListScroll);
  }, [contentEl]);
  const [loading, onLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [value, onChange] = useState<Array<Option>>([]);
  const handleAddMember = () => {
    const inviteUsers: Array<string> = [];
    const memberUsers: Array<string> = [];
    value.forEach(item => {
      if (isEmail(item.value)) {
        inviteUsers.push(item.value);
      } else {
        memberUsers.push(item.value);
      }
    });
    if (inviteUsers.length <= 0 && memberUsers.length <= 0) {
      return;
    }
    const actions: Array<Promise<any>> = [];
    if (inviteUsers.length > 0) {
      actions.push(
        http.post('invite', {
          role: 'member',
          groupId: group_id,
          emails: inviteUsers,
          namespace: namespace_id,
          inviteUrl: `${location.origin}/invite/confirm`,
          registerUrl: `${location.origin}/user/accept-invite`,
        })
      );
    }
    if (memberUsers.length > 0) {
      actions.push(
        http.post(`/namespaces/${namespace_id}/groups/${group_id}/users`, {
          userIds: memberUsers,
        })
      );
    }
    onLoading(true);
    Promise.all(actions)
      .then(() => {
        onOpen(false);
        refetch();
        onChange([]);
        inviteUsers.length > 0 &&
          toast.success(t('share.permissions.invite_success'), {
            position: 'bottom-right',
          });
      })
      .finally(() => {
        onLoading(false);
      });
  };
  const handleInputEnter = (e: any) => {
    if (e.key !== 'Enter') {
      return;
    }
    const val = (e.target as HTMLInputElement).value;
    if (!isEmail(val)) {
      return;
    }
    const isExist = value.find(item => item.email === val);
    if (isExist) {
      return;
    }
    onChange([...value, { label: val, value: val }]);
    setInputValue('');
  };

  return (
    <Popover open={open} onOpenChange={onOpen}>
      <PopoverAnchor asChild>
        <div className="w-full">
          <SettingPageButton
            className="mt-2 w-full"
            onClick={() => onOpen(true)}
          >
            <Plus />
            {t('manage.add_member')}
          </SettingPageButton>
        </div>
      </PopoverAnchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={setContent}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={16}
          data-slot="popover-content"
          className="z-50 w-[85vw] max-w-[360px] rounded-md border-none bg-popover p-0 shadow-none outline-hidden"
        >
          <MultipleSelector
            value={value}
            hideClearAllButton
            onChange={onChange}
            inputValue={inputValue}
            listClassName={memberOptionListClassName}
            options={data.map(item => ({
              label: memberRecipientLabel(item),
              value: item.user_id,
            }))}
            inputProps={{
              onValueChange: setInputValue,
              onKeyDown: handleInputEnter,
            }}
            afterAddon={
              <div className="absolute inset-y-0 right-1 flex items-center">
                <Button
                  size="sm"
                  disabled={loading}
                  onClick={handleAddMember}
                  className="h-7 w-9"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    t('manage.add')
                  )}
                </Button>
              </div>
            }
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
