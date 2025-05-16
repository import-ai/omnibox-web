import { useState } from 'react';
import { Plus } from 'lucide-react';
import { http } from '@/lib/request';
import { Button } from '@/components/ui/button';
import MultipleSelector, { Option } from '@/components/multiple-selector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Member } from '@/interface';

interface AddMemberProps {
  group_id: string;
  namespace_id: string;
  data: Array<Member>;
  refetch: () => void;
}

export default function AddMember(props: AddMemberProps) {
  const { data, namespace_id, group_id, refetch } = props;
  const [open, onOpen] = useState(false);
  const [value, onChange] = useState<Array<Option>>([]);
  const handleAddMember = () => {
    http
      .post(`/namespaces/${namespace_id}/groups/${group_id}/users`, {
        userId: value.map((item) => item.value).join(','),
      })
      .then(() => {
        onOpen(false);
        refetch();
      });
  };

  return (
    <Popover open={open} onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary" className="mt-2">
          <Plus />
          添加成员
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="p-0 shadow-none w-[400px] border-none"
      >
        <MultipleSelector
          value={value}
          onChange={onChange}
          hideClearAllButton
          options={data.map((item) => ({
            label: item.email,
            value: item.id,
          }))}
          afterAddon={
            <Button
              size="sm"
              onClick={handleAddMember}
              className="absolute right-0 top-0"
            >
              添加
            </Button>
          }
          emptyIndicator={
            <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
              no results found.
            </p>
          }
        />
      </PopoverContent>
    </Popover>
  );
}
