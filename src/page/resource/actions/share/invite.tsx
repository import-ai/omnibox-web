import { Input } from '@/components/ui/input';
// import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function InviteForm() {
  // const { t } = useTranslation();

  return (
    <div className="flex gap-2 mb-6">
      <div className="flex-1 relative">
        <Input
          className="w-full border-2 border-blue-200 rounded-md py-4 px-3 focus:border-blue-300 focus:ring-0"
          placeholder="邮件地址或群组，以逗号分隔"
        />
      </div>
      <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6">
        邀请
      </Button>
    </div>
  );
}
