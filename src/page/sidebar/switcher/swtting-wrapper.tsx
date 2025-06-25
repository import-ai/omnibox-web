import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CommonForm from './basic';
import PeopleForm from './people';
import ProfileForm from './form/profile';
import SettingForm from './form/setting';
import { useTranslation } from 'react-i18next';
import { SidebarNav } from '@/page/user/form/sidebar';

export default function SettingWrapper() {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const [userIsOwner, setUserIsOwner] = useState(false);
  const [activeKey, onActiveKey] = useState('basic');
  const items = userIsOwner
    ? [
        {
          label: t('setting.basic'),
          value: 'basic',
          children: <CommonForm />,
        },
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
      ]
    : [
        {
          label: t('setting.basic'),
          value: 'basic',
          children: <CommonForm />,
        },
        {
          label: t('setting.profile'),
          value: 'profile',
          children: <ProfileForm />,
        },
      ];

  useEffect(() => {
    http
      .get(`/namespaces/${namespaceId}/members/${localStorage.getItem('uid')}`)
      .then((res) => {
        setUserIsOwner(res.role === 'owner');
      });
  }, []);

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
      <div className="lg:flex-1 h-[66vh] sm:h-[440px] max-h-[98%] overflow-auto">
        {items.find((item) => item.value === activeKey)?.children}
      </div>
    </div>
  );
}
