import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function InvitePeople() {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between mb-8">
      <div className="flex flex-col">
        <h2 className="font-medium mb-2">{t('invite.title')}</h2>
        <p className="text-gray-600 text-sm">{t('invite.description')}</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <Button size="sm" variant="secondary">
          {t('invite.receive_link')}
        </Button>
        <Switch
          // checked={isLinkEnabled}
          // onCheckedChange={setIsLinkEnabled}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
}
