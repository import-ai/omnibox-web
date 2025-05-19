import { useState } from 'react';
import { Plus } from 'lucide-react';
import { http } from '@/lib/request';
import { Member } from '@/interface';
import { Button } from '@/components/ui/button';
import { Button as LoadingButton } from '@/components/button';
import MultipleSelector, { Option } from '@/components/multiple-selector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AddMemberProps {
  group_id: string;
  namespace_id: string;
  data: Array<Member>;
  refetch: () => void;
}

export default function AddMember(props: AddMemberProps) {
  const { data, namespace_id, group_id, refetch } = props;
  const [open, onOpen] = useState(false);
  const [loading, onLoading] = useState(false);
  const [value, onChange] = useState<Array<Option>>([]);
  const handleAddMember = () => {
    onLoading(true);
    Promise.all(
      value.map((item) =>
        http.post(`/namespaces/${namespace_id}/groups/${group_id}/users`, {
          userId: item.value,
        }),
      ),
    )
      .then(() => {
        onOpen(false);
        refetch();
      })
      .finally(() => {
        onLoading(false);
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
            <LoadingButton
              size="sm"
              loading={loading}
              onClick={handleAddMember}
              className="absolute right-0 top-0 h-7 w-9"
            >
              添加
            </LoadingButton>
          }
        />
      </PopoverContent>
    </Popover>
  );
}
