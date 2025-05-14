import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MultipleSelector, { Option } from '@/components/multiple-selector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function AddMember() {
  const [value, onChange] = useState<Array<Option>>([]);

  return (
    <Popover>
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
          options={[
            {
              label: 'Bar',
              value: 'bar',
            },
          ]}
          afterAddon={
            <Button size="sm" className="absolute right-0 top-0">
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
