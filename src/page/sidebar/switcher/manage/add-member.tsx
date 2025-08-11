import { Plus } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import MultipleSelector, { Option } from '@/components/multiple-selector';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Member } from '@/interface';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';

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
          registerUrl: `${location.origin}/user/sign-up/confirm`,
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
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary" className="mt-2">
          <Plus />
          {t('manage.add_member')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="p-0 shadow-none w-[400px] border-none"
      >
        <MultipleSelector
          value={value}
          hideClearAllButton
          onChange={onChange}
          inputValue={inputValue}
          options={data.map(item => ({
            label: item.email,
            value: item.user_id,
          }))}
          inputProps={{
            onValueChange: setInputValue,
            onKeyDown: handleInputEnter,
          }}
          afterAddon={
            <Button
              size="sm"
              disabled={loading}
              onClick={handleAddMember}
              className="absolute right-0 top-0 h-7 w-9"
            >
              {loading ? <Loader2 className="animate-spin" /> : t('manage.add')}
            </Button>
          }
        />
      </PopoverContent>
    </Popover>
  );
}
