import Action from './action';
import { cn } from '@/lib/utils';
import { IResourceData } from '@/interface';
import { useTranslation } from 'react-i18next';
import { ISidebarProps } from '@/page/sidebar/interface';
import {
  File,
  Folder,
  FolderOpen,
  LoaderCircle,
  ChevronRight,
} from 'lucide-react';
import {
  SidebarMenuSub,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function Tree(props: ISidebarProps) {
  const {
    data,
    spaceType,
    activeKey,
    expands,
    expanding,
    onExpand,
    onActiveKey,
  } = props;
  const { t } = useTranslation();
  const expand = expands.includes(data.id);
  const handleExpand = () => {
    onExpand(spaceType, data.id);
  };
  const handleActiveKey = () => {
    onActiveKey(data.id);
  };

  if (data.id === 'empty') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled>{t('no_pages_inside')}</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        open={expand}
        className={cn('group/collapsible', {
          '[&[data-state=open]>div>div>svg:first-child]:rotate-90':
            expand && expanding !== data.id,
        })}
      >
        <CollapsibleTrigger asChild>
          <div>
            <SidebarMenuButton
              asChild
              onClick={handleActiveKey}
              isActive={data.id == activeKey}
            >
              <div className="flex cursor-pointer">
                {expanding === data.id ? (
                  <LoaderCircle className="transition-transform animate-spin" />
                ) : (
                  <ChevronRight
                    className="transition-transform"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleExpand();
                    }}
                  />
                )}
                {data.resource_type === 'folder' ? (
                  expand ? (
                    <FolderOpen />
                  ) : (
                    <Folder />
                  )
                ) : (
                  <File />
                )}
                <span className="truncate">{data.name || t('untitled')}</span>
              </div>
            </SidebarMenuButton>
            <Action {...props} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 mr-0">
            {Array.isArray(data.children) &&
              data.children.length > 0 &&
              data.children.map((item: IResourceData) => (
                <Tree {...props} data={item} key={item.id} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
