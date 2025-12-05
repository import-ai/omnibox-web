import { History, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsTouch } from '@/hooks/use-is-touch';
import { cn } from '@/lib/utils';
import SearchMenu from '@/page/search';

import { ChatIcon } from './Chat';

interface IProps {
  active: boolean;
  onActiveKey: (activeKey: string) => void;
}

export function Header(props: IProps) {
  const { active, onActiveKey } = props;
  const [search, setSearch] = useState(false);
  const { t } = useTranslation();
  const isTouch = useIsTouch();
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
      <SidebarMenu className="mb-[16px]">
        <SidebarMenuItem className="group/chat">
          <SidebarMenuButton
            asChild
            isActive={active}
            className="h-auto py-1.5 pr-1"
          >
            <div
              className="flex items-center cursor-pointer gap-[8px]"
              onClick={onChat}
            >
              <ChatIcon className="size-[18px] text-[#3D86F9]" />
              <span className="font-normal">{t('chat.title')}</span>
            </div>
          </SidebarMenuButton>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onChatHistory}
                  className={cn(
                    'p-0 w-5 h-5 [&_svg]:size-4 absolute top-[6px] z-10 right-1 focus-visible:outline-none focus-visible:ring-transparent',
                    isTouch
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover/chat:opacity-100 group-hover/chat:pointer-events-auto'
                  )}
                >
                  <History className="focus-visible:outline-none focus-visible:ring-transparent" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('chat.conversations.history')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={onSearch}
            >
              <Search className="size-4 text-[#8F959E]" />
              <span>{t('search.title')}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
