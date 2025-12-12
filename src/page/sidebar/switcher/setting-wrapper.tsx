import axios from 'axios';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import useUser from '@/hooks/use-user';
import { http } from '@/lib/request';

import { ApplicationsForm } from './applications';
import CommonForm from './basic';
import Content from './content';
import { APIKeyForm } from './form/api-key';
import ProfileForm from './form/profile';
import SettingForm from './form/setting';
import TasksManagement from './manage/tasks';
import PeopleForm from './people';
import { SettingsSidebar } from './settings-sidebar';
import { SettingsToastProvider } from './settings-toast';

interface SettingWrapperProps {
  initialTab?: string;
  autoAction?: {
    type: 'bind';
    appId: string;
  };
  onClose?: () => void;
}

export default function SettingWrapper({
  initialTab,
  autoAction,
  onClose,
}: SettingWrapperProps) {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const [userIsOwner, setUserIsOwner] = useState(false);
  const [activeKey, onActiveKey] = useState(initialTab || 'profile');
  const { user } = useUser();

  const items = [
    {
      value: 'profile',
      children: <ProfileForm />,
    },
    {
      value: 'namespace',
      children: <SettingForm />,
      requireOwner: true,
    },
    {
      value: 'people',
      children: <PeopleForm />,
      requireOwner: true,
    },
    {
      value: 'tasks',
      children: <TasksManagement />,
    },
    {
      value: 'applications',
      children: <ApplicationsForm autoAction={autoAction} />,
    },
    {
      value: 'apikey',
      children: <APIKeyForm />,
    },
    {
      value: 'basic',
      children: <CommonForm />,
    },
    {
      value: 'content',
      children: <Content />,
    },
  ];

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(
        `/namespaces/${namespaceId}/members/${localStorage.getItem('uid')}`,
        {
          cancelToken: source.token,
          mute: true,
        }
      )
      .then(res => {
        setUserIsOwner(res.role === 'owner');
      })
      .catch(err => {
        if (err?.response?.data?.code === 'user_not_owner') {
          setUserIsOwner(false);
        }
      });
    return () => {
      source.cancel();
    };
  }, []);

  return (
    <SettingsToastProvider>
      <div className="relative h-[517px] w-[858px] rounded-xl bg-card">
        <div className="absolute inset-0 rounded-xl bg-card" />

        <div className="absolute left-0 top-0 h-[517px] w-[247px]">
          <SettingsSidebar
            value={activeKey}
            onChange={onActiveKey}
            username={user?.username || ''}
            userIsOwner={userIsOwner}
          />
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-3.5 z-10 text-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="absolute left-[247px] top-0 right-0 bottom-0 rounded-r-xl dark:bg-neutral-900" />
        <div className="absolute left-[286px] top-10 h-[calc(517px-60px)] w-[549px] overflow-y-auto overflow-x-hidden pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-900">
          {
            items
              .filter(item => !item.requireOwner || userIsOwner)
              .find(item => item.value === activeKey)?.children
          }
        </div>
      </div>
    </SettingsToastProvider>
  );
}
