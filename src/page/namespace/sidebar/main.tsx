import App from '@/hooks/app.class';
import { Sparkles } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const data = [{ label: 'Chat', value: 'chat' }];

interface IProps {
  app: App;
  active: boolean;
  onActiveKey: (activeKey: string) => void;
}

export function NavMain(props: IProps) {
  const { app, active, onActiveKey } = props;
  const handleClick = (val: string) => {
    if (val === 'chat') {
      onActiveKey('chat');
      app.fire('resource_wrapper', true);
    }
  };

  return (
    <SidebarMenu>
      {data.map(({ label, value }) => {
        return (
          <SidebarMenuItem key={value}>
            <SidebarMenuButton asChild isActive={active}>
              <div
                className="flex cursor-pointer"
                onClick={() => handleClick(value)}
              >
                <Sparkles />
                <span>{label}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
