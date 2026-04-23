import copy from 'copy-to-clipboard';
import {
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 data-[state=open]:bg-accent"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => handleAction('copy_link')}
        >
          <Link className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
          <span>{t('actions.copy_link')}</span>
        </DropdownMenuItem>
        {resource.content && (
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => handleAction('copy_content')}
          >
            <Files className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
            <span>{t('actions.copy_content')}</span>
          </DropdownMenuItem>
        )}
        {/* Download as */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer gap-2">
            <Download className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
            <span>{t('actions.download_as')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => handleAction('download_as_markdown')}
            >
              {t('actions.download_as_tooltip', { format: 'Markdown' })}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {onWide && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => handleAction('wide')}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <MoveHorizontal className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
                  <span>{t('actions.wide')}</span>
                </div>
                <Switch checked={wide} />
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
