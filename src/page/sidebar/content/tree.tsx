import Icon from './icon';
import Action from './action';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import { IResourceData } from '@/interface';
import { useTranslation } from 'react-i18next';
import { useDrag, useDrop } from 'react-dnd';
import { ISidebarProps } from '@/page/sidebar/interface';
import { LoaderCircle, ChevronRight } from 'lucide-react';
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

export interface ITreeProps extends ISidebarProps {
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
  target: IResourceData | null;
  onTarget: (target: IResourceData | null) => void;
}

export default function Tree(props: ITreeProps) {
  const {
    data,
    onDrop,
    target,
    onTarget,
    spaceType,
    activeKey,
    expands,
    expanding,
    onExpand,
    onActiveKey,
  } = props;
  const ref = useRef(null);
  const { t } = useTranslation();
  const expand = expands.includes(data.id);
  const [dragStyle, drag] = useDrag({
    type: 'card',
    item: data,
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.5 : 1,
    }),
  });
  const [, drop] = useDrop({
    accept: 'card',
    hover: (item, monitor) => {
      if (!ref.current) {
        onTarget(null);
        return;
      }
      const didHover = monitor.isOver();
      if (!didHover) {
        onTarget(null);
        return;
      }
      const dragId = (item as IResourceData).id;
      if (dragId === data.id) {
        onTarget(null);
        return;
      }
      onTarget(data);
    },
    drop(item) {
      onDrop(item as IResourceData, target);
    },
  });
  const handleExpand = () => {
    onExpand(spaceType, data.id);
  };
  const handleActiveKey = () => {
    onActiveKey(data.id);
  };

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, []);

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
              className="gap-1"
              onClick={handleActiveKey}
              isActive={data.id == activeKey}
            >
              <div
                ref={ref}
                style={dragStyle}
                className={cn(
                  'flex cursor-pointer relative before:absolute before:content-[""] before:hidden before:left-[13px] before:right-[4px] before:h-[2px] before:bg-blue-500',
                  {
                    'bg-sidebar-accent text-sidebar-accent-foreground':
                      target && target.id === data.id,
                  },
                )}
              >
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
                <Icon expand={expand} resource={data} />
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
