import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function InvitePeople() {
  const { t } = useTranslation();
  const [checked, onChcked] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText('value');
  };

  return (
    <div className="flex justify-between mb-4 flex-wrap">
      <div className="flex flex-col">
        <h2 className="font-medium mb-2">{t('invite.title')}</h2>
        <p className="text-gray-600 text-sm">{t('invite.description')}</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        {checked && (
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {t('invite.receive_link')}
          </Button>
        )}
        <Switch
          checked={checked}
          onCheckedChange={onChcked}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
}
