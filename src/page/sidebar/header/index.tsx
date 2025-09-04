import { History, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import SearchMenu from '@/page/search';

interface IProps {
  active: boolean;
  onActiveKey: (activeKey: string) => void;
}

export function Header(props: IProps) {
  const { active, onActiveKey } = props;
  const [search, setSearch] = useState(false);
  const { t } = useTranslation();
  const onChat = () => {
    onActiveKey('chat');
  };
  const onSearch = () => {
    setSearch(true);
  };
  const onChatHistory = () => {
    onActiveKey('chat/conversations');
  };

  return (
    <>
      <SearchMenu open={search} onOpenChange={setSearch} />
      <SidebarMenu>
        <SidebarMenuItem className="group">
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
            className="p-0 w-5 h-5 [&_svg]:size-4 absolute top-[6px] z-10 right-0 focus-visible:outline-none focus-visible:ring-transparent opacity-0 group-hover:opacity-100"
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
    </>
  );
}
