import axios from 'axios';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import useUser from '@/hooks/use-user';
import { http } from '@/lib/request';
import PeopleForm from '@/page/people';
import TasksManagement from '@/page/settings/tabs/members/tasks';

import { SettingsSidebar } from './settings-sidebar';
import { SettingsToastProvider } from './settings-toast';
import About from './tabs/about';
import { APIKeyForm } from './tabs/account/api-key';
import SettingForm from './tabs/account/namespace-settings';
import { ApplicationsForm } from './tabs/applications';
import CommonForm from './tabs/basic';
import Content from './tabs/content';
import ProfileForm from './tabs/profile';

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
  const [userIsOwnerOrAdmin, setUserIsOwnerOrAdmin] = useState(false);
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
      children: (
        <SettingForm
          namespaceId={namespaceId}
          userIsOwner={userIsOwner}
          userIsOwnerOrAdmin={userIsOwnerOrAdmin}
          onClose={onClose}
        />
      ),
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
    {
      value: 'about',
      children: <About />,
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
        setUserIsOwnerOrAdmin(res.role === 'owner' || res.role === 'admin');
      })
      .catch(err => {
        if (err?.response?.data?.code === 'user_not_owner') {
          setUserIsOwner(false);
          setUserIsOwnerOrAdmin(false);
        }
      });
    return () => {
      source.cancel();
    };
  }, []);

  return (
    <SettingsToastProvider>
      <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[12px] bg-card lg:flex-row">
        {/* Sidebar */}
        <div className="w-full shrink-0 lg:w-[247px]">
          <SettingsSidebar
            value={activeKey}
            onChange={onActiveKey}
            username={user?.username || ''}
            userIsOwnerOrAdmin={userIsOwnerOrAdmin}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-3.5 z-10 text-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Content area */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-white px-5 py-4 dark:bg-neutral-800 lg:p-4 lg:pl-10 lg:pt-10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-900 [&::-webkit-scrollbar]:w-1.5">
          {
            items
              .filter(item => !item.requireOwner || userIsOwnerOrAdmin)
              .find(item => item.value === activeKey)?.children
          }
        </div>
      </div>
    </SettingsToastProvider>
  );
}
