import { Separator } from '@/components/ui/separator';
import { ProfileForm } from '@/components/user/profile-form';
import { SidebarNav } from '@/components/user/sidebar-nav';

const sidebarNavItems = [
  {
    title: '个人资料',
    href: '/settings',
  },
  {
    title: '账号',
    href: '/settings/account',
  },
  {
    title: '外观',
    href: '/settings/appearance',
  },
  {
    title: '通知',
    href: '/settings/notifications',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-10 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">设置</h2>
        <p className="text-muted-foreground">管理您的账号设置和偏好</p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className="flex-1 lg:max-w-2xl">
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}
