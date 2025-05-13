import { toast } from 'sonner';
import Actions from './action';
import { useState } from 'react';
import { http } from '@/lib/request';
import { Permission } from '@/interface';
// import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import TextareaAutosize from 'react-textarea-autosize';

interface InviteFormProps {
  resource_id: string;
  namespace_id: string;
}

export default function InviteForm(props: InviteFormProps) {
  const { resource_id, namespace_id } = props;
  const [value, onChange] = useState('');
  const visible = value.length > 0;
  const [loading, onLoading] = useState(false);
  const [permission, onPermission] = useState<Permission>('full_access');
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  const handleSubmit = () => {
    onLoading(true);
    http
      .post('invite/user', {
        resource_id,
        namespace_id,
        accessUrl: `/${namespace_id}/${resource_id}`,
        registerUrl: `${location.origin}/user/sign-up/comfirm`,
      })
      .then(() => {
        onChange('');
        toast('已邀请');
      })
      .finally(() => {
        onLoading(false);
      });
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
          <Actions
            value={permission}
            onChange={onPermission}
            className="absolute top-[4px] right-[4px] p-1 rounded-sm bg-gray-200 text-sm"
          />
        )}
      </div>
      <Button
        loading={loading}
        disabled={!visible}
        onClick={handleSubmit}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6"
      >
        邀请
      </Button>
    </div>
  );
}
