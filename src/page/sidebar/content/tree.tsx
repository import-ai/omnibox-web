import Action from './action';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import { IResourceData } from '@/interface';
import { useTranslation } from 'react-i18next';
import { useDrag, useDrop, XYCoord } from 'react-dnd';
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

export interface ITreeProps extends ISidebarProps {
  onDrop: (
    target: IResourceData,
    highlight: { pos: string; target: IResourceData | null },
  ) => void;
  highlight: { pos: string; target: IResourceData | null };
  onHighlight: (highlight: {
    pos: string;
    target: IResourceData | null;
  }) => void;
}

export default function Tree(props: ITreeProps) {
  const {
    data,
    onDrop,
    activeKey,
    expands,
    expanding,
    onExpand,
    onActiveKey,
    highlight,
    onHighlight,
  } = props;
  const ref = useRef(null);
  const { t } = useTranslation();
  const expand = expands.includes(data.id);
  const [, drag] = useDrag({
    type: 'card',
    item: data,
  });
  const [, drop] = useDrop({
    accept: 'card',
    hover: (item, monitor) => {
      if (!ref.current) {
        onHighlight({ target: null, pos: '' });
        return;
      }
      const didHover = monitor.isOver();
      if (!didHover) {
        onHighlight({ target: null, pos: '' });
        return;
      }
      const dragId = (item as IResourceData).id;
      if (dragId === data.id) {
        onHighlight({ target: null, pos: '' });
        return;
      }
      const rect = (ref.current as HTMLDivElement).getBoundingClientRect();
      const thirdsHeight = rect.height / 3;
      const rectTop = rect.top;
      const rectBottom = rect.bottom;
      const topCenter = rectTop + thirdsHeight;
      const bottomCenter = rectBottom - thirdsHeight;
      const clientOffset = monitor.getClientOffset() as XYCoord;
      const hoverY = clientOffset.y;
      if (hoverY > rectTop && hoverY < topCenter) {
        onHighlight({ target: data, pos: 'top' });
      } else if (hoverY > topCenter && hoverY < bottomCenter) {
        onHighlight({ target: data, pos: 'center' });
      } else if (hoverY > bottomCenter && hoverY < rectBottom) {
        onHighlight({ target: data, pos: 'bottom' });
      }
    },
    drop(item) {
      onDrop(item as IResourceData, highlight);
    },
  });
  const handleExpand = () => {
    onExpand(data.id, data.space_type);
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
              onClick={handleActiveKey}
              isActive={data.id == activeKey}
            >
              <div
                ref={ref}
                className={cn(
                  'flex cursor-pointer relative before:absolute before:content-[""] before:hidden before:left-[13px] before:right-[4px] before:h-[2px] before:bg-blue-500',
                  {
                    'bg-sidebar-accent text-sidebar-accent-foreground':
                      highlight.target &&
                      highlight.target.id === data.id &&
                      highlight.pos === 'center',
                    'before:top-0 before:block':
                      highlight.target &&
                      highlight.target.id === data.id &&
                      highlight.pos === 'top',
                    'before:bottom-0 before:block':
                      highlight.target &&
                      highlight.target.id === data.id &&
                      highlight.pos === 'bottom',
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
