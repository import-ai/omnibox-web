import { Sparkles, History } from 'lucide-react';
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
  const { t } = useTranslation();
  const onChat = () => {
    onActiveKey('chat');
  };
  const onChatHistory = () => {
    onActiveKey('chat/conversations');
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active}>
          <div className="flex items-center justify-between">
            <div
              className="flex flex-grow gap-2 items-center cursor-pointer"
              onClick={onChat}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('chat')}</span>
            </div>
            <History
              className="cursor-pointer w-4 h-4"
              onClick={onChatHistory}
            />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
