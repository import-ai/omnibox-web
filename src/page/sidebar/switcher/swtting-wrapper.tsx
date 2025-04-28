import { useState } from 'react';
import PeopleForm from './people';
import ProfileForm from './form/profile';
import SettingForm from './form/setting';
import { useTranslation } from 'react-i18next';
import { SidebarNav } from '@/page/user/form/sidebar';

export default function SettingWrapper() {
  const { t } = useTranslation();
  const [activeKey, onActiveKey] = useState('profile');
  const items = [
    {
      label: t('setting.profile'),
      value: 'profile',
      children: <ProfileForm />,
    },
    {
      label: t('setting.namespace'),
      value: 'namespace',
      children: <SettingForm />,
    },
    {
      label: t('setting.members'),
      value: 'people',
      children: <PeopleForm />,
    },
  ];

  return (
    <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-8 lg:space-y-0">
      <aside className="lg:w-1/5">
        <SidebarNav
          value={activeKey}
          onChange={onActiveKey}
          items={items.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
        />
      </aside>
      <div className="lg:flex-1 lg:max-w-2xl h-[440px] max-h-[98%] overflow-auto">
        {items.find((item) => item.value === activeKey)?.children}
      </div>
    </div>
  );
}
