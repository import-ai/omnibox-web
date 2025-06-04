import { getActions } from './utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/i18n/language-toggle';
import { ThemeToggle } from '@/page/resource/theme-toggle';
import { History, MoreHorizontal, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface IProps {
  homePage: boolean;
  conversationPage: boolean;
  conversationsPage: boolean;
  namespaceId: string;
}

export default function Actions(props: IProps) {
  const { homePage, conversationsPage, namespaceId } = props;
  const navigate = useNavigate();
  const actionsData = homePage || conversationsPage ? [] : getActions();
  const onChatHistory = () => {
    navigate(`/${namespaceId}/chat/conversations`);
  };
  const onChatCreate = () => {
    navigate(`/${namespaceId}/chat`);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <LanguageToggle />
      <ThemeToggle />
      {conversationsPage ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onChatCreate}
        >
          <Plus />
        </Button>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onChatHistory}
        >
          <History />
        </Button>
      )}
      {actionsData.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 data-[state=open]:bg-accent"
            >
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 overflow-hidden rounded-lg p-0"
            align="end"
          >
            <Sidebar collapsible="none" className="bg-transparent">
              <SidebarContent className="gap-0">
                {actionsData.map((group, index) => (
                  <SidebarGroup key={index} className="border-b">
                    <SidebarGroupContent className="gap-0">
                      <SidebarMenu>
                        {group.map((item, index) => (
                          <SidebarMenuItem key={index}>
                            <SidebarMenuButton>
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}
              </SidebarContent>
            </Sidebar>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
