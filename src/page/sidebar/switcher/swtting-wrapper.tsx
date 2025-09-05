import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { http } from '@/lib/request';
import { SidebarNav } from '@/page/user/form/sidebar';

import { ApplicationsForm } from './applications';
import CommonForm from './basic';
import { APIKeyForm } from './form/api-key';
import ProfileForm from './form/profile';
import SettingForm from './form/setting';
import TasksManagement from './manage/tasks';
import PeopleForm from './people';
import { ThirdPartyForm } from './third-party';

export default function SettingWrapper() {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const [userIsOwner, setUserIsOwner] = useState(false);
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
      requireOwner: true,
    },
    {
      label: t('setting.members'),
      value: 'people',
      children: <PeopleForm />,
      requireOwner: true,
    },
    {
      label: t('setting.tasks'),
      value: 'tasks',
      children: <TasksManagement />,
      requireOwner: true,
    },
    {
      label: t('setting.applications'),
      value: 'applications',
      children: <ApplicationsForm />,
      requireOwner: true,
    },
    {
      label: t('setting.api_key'),
      value: 'apikey',
      children: <APIKeyForm />,
    },
    {
      label: t('setting.basic'),
      value: 'basic',
      children: <CommonForm />,
    },
    {
      label: t('setting.third_party_account.manage'),
      value: 'third-party',
      children: <ThirdPartyForm />,
    },
  ];

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(
        `/namespaces/${namespaceId}/members/${localStorage.getItem('uid')}`,
        {
          cancelToken: source.token,
        }
      )
      .then(res => {
        setUserIsOwner(res.role === 'owner');
      });
    return () => {
      source.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-8 lg:space-y-0">
      <aside className="lg:w-1/5">
        <SidebarNav
          value={activeKey}
          onChange={onActiveKey}
          items={items
            .filter(item => !item.requireOwner || userIsOwner)
            .map(item => ({
              label: item.label,
              value: item.value,
            }))}
        />
      </aside>
      <div className="lg:flex-1 h-[66vh] sm:h-[440px] max-h-[98%] overflow-auto">
        {
          items
            .filter(item => !item.requireOwner || userIsOwner)
            .find(item => item.value === activeKey)?.children
        }
      </div>
    </div>
  );
}
