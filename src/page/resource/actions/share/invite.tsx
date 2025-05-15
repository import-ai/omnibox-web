import { toast } from 'sonner';
import { useState } from 'react';
import { http } from '@/lib/request';
import { Permission } from '@/interface';
// import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import Actions from '@/components/permission-action/action';
import { AutosizeTextarea } from '@/components/autosize-textarea';

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
  const handlePermission = (val: Permission) => {
    onPermission(val);
    return Promise.resolve();
  };
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
        <AutosizeTextarea
          value={value}
          minHeight={36}
          maxHeight={200}
          onChange={handleChange}
          placeholder="邮件地址或群组，一行一个"
          className="resize-none !leading-[26px] py-1 pr-24"
        />
        {visible && (
          <Actions
            value={permission}
            onChange={handlePermission}
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
