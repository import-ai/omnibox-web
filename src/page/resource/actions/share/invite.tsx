import { toast } from 'sonner';
import { useState } from 'react';
import { http } from '@/lib/request';
import isEmail from '@/lib/is-email';
import { Permission } from '@/interface';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import Actions from '@/components/permission-action/action';
import { getData } from '@/components/permission-action/data';
import { AutosizeTextarea } from '@/components/autosize-textarea';

interface InviteFormProps {
  resource_id: string;
  namespace_id: string;
}

export default function InviteForm(props: InviteFormProps) {
  const { resource_id, namespace_id } = props;
  const [value, onChange] = useState('');
  const data = getData();
  const visible = value.length > 0;
  const { t } = useTranslation();
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
    const userEmails = value.split(/，|,/).filter((item) => isEmail(item));
    if (userEmails.length <= 0) {
      return;
    }
    onLoading(true);
    http
      .post('invite', {
        role: 'member',
        resourceId: resource_id,
        namespace: namespace_id,
        email: userEmails.join(','),
        permissionLevel: permission,
        inviteUrl: `${location.origin}/invite/comfirm`,
        registerUrl: `${location.origin}/user/sign-up/comfirm`,
      })
      .then(() => {
        onChange('');
        toast.success(t('share.invite_success'), {
          position: 'top-center',
        });
      })
      .finally(() => {
        onLoading(false);
      });
  };

  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 relative">
        <AutosizeTextarea
          value={value}
          minHeight={36}
          maxHeight={200}
          onChange={handleChange}
          placeholder={t('share.invite_placeholder')}
          className="resize-none !leading-[26px] py-1 pr-24"
        />
        {visible && (
          <Actions
            value={permission}
            onChange={handlePermission}
            data={data.filter((item) => item.value !== 'no_access')}
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
        {t('share.invite')}
      </Button>
    </div>
  );
}
