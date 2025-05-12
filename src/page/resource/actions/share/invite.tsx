import Actions from './action';
import { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';

export default function InviteForm() {
  const [value, onChange] = useState('');
  const visible = value.length > 0;
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex gap-2 mb-6">
      <div className="flex-1 relative">
        <TextareaAutosize
          value={value}
          onChange={handleChange}
          placeholder="邮件地址或群组，一行一个"
          className="min-h-[36px] resize-none flex w-full !leading-[26px] rounded-md border border-input bg-transparent px-3 py-1 pr-24 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        {visible && (
          <Actions className="absolute top-[4px] right-[4px] p-1 rounded-sm bg-gray-200 text-sm" />
        )}
      </div>
      <Button
        disabled={!visible}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6"
      >
        邀请
      </Button>
    </div>
  );
}
