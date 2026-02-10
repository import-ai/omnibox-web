import copy from 'copy-to-clipboard';
import {
  ChevronRight,
  Download,
  Files,
  Link,
  MoreHorizontal,
  MoveHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';

interface ShareActionsProps {
  resource: {
    id: string;
    name?: string;
    resource_type: string;
    content?: string;
    attrs?: Record<string, any>;
  };
  wide?: boolean;
  onWide?: (wide: boolean) => void;
}

export default function ShareActions({
  resource,
  wide,
  onWide,
}: ShareActionsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [downloadAsOpen, setDownloadAsOpen] = useState(false);

  const handleAction = (id: string) => {
    if (id === 'copy_link') {
      const returnValue = copy(location.href);
      toast(t(returnValue ? 'copy.success' : 'copy.fail'), {
        position: 'bottom-right',
      });
      setOpen(false);
      return;
    }

    if (id === 'copy_content' && resource.content) {
      const returnValue = copy(resource.content, {
        format: 'text/plain',
      });
      toast(t(returnValue ? 'copy.success' : 'copy.fail'), {
        position: 'bottom-right',
      });
      setOpen(false);
      return;
    }

    if (id === 'download_as_markdown') {
      if (!resource.content) {
        toast(t('resource.no_content'), {
          position: 'bottom-right',
        });
        setOpen(false);
        return;
      }

      // generate file name: use resource.name, if empty, use "untitled"
      const baseName = resource.name || t('untitled');
      const fileName = baseName.endsWith('.md') ? baseName : `${baseName}.md`;

      const blob = new Blob([resource.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setOpen(false);
      return;
    }

    if (id === 'wide' && onWide) {
      onWide(!wide);
      setOpen(false);
      return;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        align="end"
        className="w-56 overflow-hidden rounded-lg p-0"
      >
        <Sidebar collapsible="none" className="bg-transparent">
          <SidebarContent className="gap-0">
            <SidebarGroup className="border-b">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleAction('copy_link')}
                    >
                      <Link />
                      <span>{t('actions.copy_link')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {resource.content && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleAction('copy_content')}
                      >
                        <Files />
                        <span>{t('actions.copy_content')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {/* Download as */}
                  <SidebarMenuItem>
                    <Popover
                      open={downloadAsOpen}
                      onOpenChange={setDownloadAsOpen}
                    >
                      <PopoverTrigger asChild>
                        <SidebarMenuButton
                          onMouseEnter={() => setDownloadAsOpen(true)}
                          onMouseLeave={() => setDownloadAsOpen(false)}
                        >
                          <Download />
                          <span>{t('actions.download_as')}</span>
                          <ChevronRight className="ml-auto" />
                        </SidebarMenuButton>
                      </PopoverTrigger>
                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-48 p-1"
                        onMouseEnter={() => setDownloadAsOpen(true)}
                        onMouseLeave={() => setDownloadAsOpen(false)}
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                            onClick={() => {
                              handleAction('download_as_markdown');
                              setDownloadAsOpen(false);
                            }}
                          >
                            {t('actions.download_as_tooltip', {
                              format: 'Markdown',
                            })}
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {onWide && (
              <SidebarGroup className="border-b border-t">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        onClick={() => handleAction('wide')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-center">
                            <MoveHorizontal className="size-4" />
                            <span>{t('actions.wide')}</span>
                          </div>
                          <Switch checked={wide} />
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>
      </PopoverContent>
    </Popover>
  );
}
