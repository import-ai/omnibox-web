import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/page/user/form/profile';
import { SidebarNav } from '@/page/user/form/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function SettingsPage() {
  const [activeKey, onActiveKey] = useState('settings');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground h-7 gap-1 px-2"
        >
          <Settings />
          设置
        </Button>
      </DialogTrigger>
      <DialogContent className="w-4/5 max-w-7xl">
        <DialogHeader>
          <DialogTitle>偏好设置</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav
              value={activeKey}
              onChange={onActiveKey}
              items={[
                {
                  label: '个人资料',
                  value: 'settings',
                },
                {
                  label: '账号',
                  value: 'account',
                },
                {
                  label: '外观',
                  value: 'appearance',
                },
                {
                  label: '通知',
                  value: 'notifications',
                },
              ]}
            />
          </aside>
          <div className="flex-1 lg:max-w-2xl">
            <ProfileForm />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
