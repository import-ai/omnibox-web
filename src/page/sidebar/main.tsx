import { Button } from '@/components/ui/button';
import { Sparkles, History, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface IProps {
  active: boolean;
  onActiveKey: (activeKey: string) => void;
  onSearch: () => void;
}

export function NavMain(props: IProps) {
  const { active, onActiveKey, onSearch } = props;
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
          <div className="flex cursor-pointer" onClick={onChat}>
            <Sparkles className="w-4 h-4" />
            <span>{t('chat.title')}</span>
          </div>
        </SidebarMenuButton>
        <Button
          size="icon"
          variant="ghost"
          onClick={onChatHistory}
          className="p-0 w-5 h-5 [&_svg]:size-4 absolute top-[6px] z-10 right-0 focus-visible:outline-none focus-visible:ring-transparent"
        >
          <History className="focus-visible:outline-none focus-visible:ring-transparent" />
        </Button>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={onSearch}
          >
            <Search className="w-4 h-4" />
            <span>{t('search.title')}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
