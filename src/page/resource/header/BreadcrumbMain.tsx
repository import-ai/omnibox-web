import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import useApp from '@/hooks/useApp';
import { PathItem, RssItemBreadcrumb } from '@/interface';
import { cn } from '@/lib/utils';

interface IProps {
  className?: string;
  namespaceId: string;
  path?: PathItem[];
}

export default function BreadcrumbMain(props: IProps) {
  const { className, namespaceId, path = [] } = props;
  const app = useApp();
  const navigate = useNavigate();
  const { rss_item_id: rssItemId } = useParams();
  const { t } = useTranslation();
  const [rssItem, setRssItem] = useState<RssItemBreadcrumb | null>(null);

  useEffect(() => {
    return app.on('rss_item_loaded', (item: RssItemBreadcrumb) => {
      if (item.id === rssItemId) {
        setRssItem(item);
      }
    });
  }, [app, rssItemId]);

  if (path.length <= 1) {
    return null;
  }
  const hasLoadedRssItem = Boolean(rssItemId && rssItem?.id === rssItemId);
  const activePath = hasLoadedRssItem
    ? [...path, { id: rssItem.id, name: rssItem.title || '' }]
    : path;
  const data = activePath.slice(1); // Remove first item (root)

  // If 3 or fewer items, display all normally
  if (data.length <= 3) {
    const size = data.length - 1;
    return (
      <Breadcrumb className={cn(className)}>
        <BreadcrumbList className="gap-0 sm:gap-0">
          {data.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <BreadcrumbSeparator />}
              {index >= size && (!rssItemId || hasLoadedRssItem) ? (
                <BreadcrumbItem>
                  <BreadcrumbPage
                    title={item.name || t('untitled')}
                    className="font-normal text-foreground line-clamp-1 pl-2 truncate max-w-[240px]"
                  >
                    {item.name || t('untitled')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Button
                      variant="ghost"
                      className="h-6 max-w-[240px] justify-start overflow-hidden px-2 py-0 font-normal text-foreground"
                      onClick={() => {
                        navigate(`/${namespaceId}/${item.id}`);
                      }}
                    >
                      <span className="min-w-0 truncate text-left">
                        {item.name || t('untitled')}
                      </span>
                    </Button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // If more than 3 items, show root, dropdown (middle items), and current
  const currentItem = data[data.length - 1]; // Current page
  const rootItem = data[0]; // Root item
  const middleItems = data.slice(1, -1); // Items between root and current

  return (
    <Breadcrumb className={cn(className)}>
      <BreadcrumbList className="gap-0 sm:gap-0">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Button
              variant="ghost"
              className="h-6 max-w-[240px] justify-start overflow-hidden px-2 py-0 font-normal text-foreground"
              onClick={() => {
                navigate(`/${namespaceId}/${rootItem.id}`);
              }}
            >
              <span className="min-w-0 truncate text-left">
                {rootItem.name || t('untitled')}
              </span>
            </Button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1">
              <BreadcrumbEllipsis className="size-4" />
              <span className="sr-only">Toggle menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {middleItems.map(item => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => {
                    navigate(`/${namespaceId}/${item.id}`);
                  }}
                  className="cursor-pointer"
                >
                  {item.name || t('untitled')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {rssItemId && !hasLoadedRssItem ? (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Button
                variant="ghost"
                className="h-6 max-w-[240px] justify-start overflow-hidden px-2 py-0 font-normal text-foreground"
                onClick={() => {
                  navigate(`/${namespaceId}/${currentItem.id}`);
                }}
              >
                <span className="min-w-0 truncate text-left">
                  {currentItem.name || t('untitled')}
                </span>
              </Button>
            </BreadcrumbLink>
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage
              title={currentItem.name || t('untitled')}
              className="font-normal text-foreground line-clamp-1 pl-2 truncate max-w-[240px]"
            >
              {currentItem.name || t('untitled')}
            </BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
