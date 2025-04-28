import { Sparkles } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const data = [{ label: 'Chat', value: 'chat' }];

interface IProps {
  active: boolean;
  onActiveKey: (activeKey: string) => void;
}

export function NavMain(props: IProps) {
  const { active, onActiveKey } = props;

  return (
    <SidebarMenu>
      {data.map(({ label, value }) => {
        return (
          <SidebarMenuItem key={value}>
            <SidebarMenuButton asChild isActive={active}>
              <div
                className="flex cursor-pointer"
                onClick={() => onActiveKey(value)}
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
