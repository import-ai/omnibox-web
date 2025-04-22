import { cn } from '@/lib/utils';
import DropdownMenu, { IResourceProps } from './dropdown';
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

interface IProps extends IResourceProps {}

export default function Tree(props: IProps) {
  const { data, activeKey, expands, expanding, onExpand, onActiveKey } = props;
  const hasChildren = data.childCount > 0;
  const expand = expands.includes(data.id);
  const handleExpand = () => {
    onExpand(data.id, data.spaceType);
  };
  const handleActiveKey = () => {
    onActiveKey(data.id);
  };

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
                {hasChildren &&
                  (expanding === data.id ? (
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
                  ))}
                {data.resourceType === 'folder' ? (
                  expand ? (
                    <FolderOpen />
                  ) : (
                    <Folder />
                  )
                ) : (
                  <File />
                )}
                <span className="truncate">{data.name || 'Untitled'}</span>
              </div>
            </SidebarMenuButton>
            <DropdownMenu {...props} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 mr-0">
            {hasChildren &&
              Array.isArray(data.children) &&
              data.children.length > 0 &&
              data.children.map((item) => (
                <Tree {...props} data={item} key={item.id} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
