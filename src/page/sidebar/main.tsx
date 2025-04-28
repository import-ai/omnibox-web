import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface IProps {
  active: boolean;
  onActiveKey: (activeKey: string) => void;
}

export function NavMain(props: IProps) {
  const { active, onActiveKey } = props;
  const { t } = useTranslation('sidebar');

  return (
    <SidebarMenu>
      {[{ label: t('chat'), value: 'chat' }].map(({ label, value }) => {
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
