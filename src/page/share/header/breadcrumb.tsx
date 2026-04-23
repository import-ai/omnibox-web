import React from 'react';
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
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PathItem } from '@/interface';
import { cn } from '@/lib/utils';

interface IProps {
  className?: string;
  path?: PathItem[];
  fallbackName?: string;
}

export default function ShareBreadcrumb(props: IProps) {
  const { className, path = [], fallbackName } = props;
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const shareId = params.share_id;

  const data = path;

  if (data.length <= 0) {
    return (
      <Breadcrumb className={cn(className)}>
        <BreadcrumbList className="gap-0 sm:gap-0">
          <BreadcrumbItem>
            <BreadcrumbPage
              title={fallbackName || t('untitled')}
              className="line-clamp-1 max-w-[240px] truncate pl-2 font-normal text-foreground"
            >
              {fallbackName || t('untitled')}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // If 3 or fewer items, display all normally
  if (data.length <= 3) {
    const size = data.length - 1;
    return (
      <Breadcrumb className={cn(className)}>
        <BreadcrumbList className="gap-0 sm:gap-0">
          {data.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <BreadcrumbSeparator />}
              {index >= size ? (
                <BreadcrumbItem>
                  <BreadcrumbPage
                    title={item.name || t('untitled')}
                    className="line-clamp-1 max-w-[240px] truncate pl-2 font-normal text-foreground"
                  >
                    {item.name || t('untitled')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Button
                      variant="ghost"
                      className="h-6 max-w-[240px] truncate px-2 py-0 font-normal text-foreground"
                      onClick={() => {
                        navigate(`/s/${shareId}/${item.id}`);
                      }}
                    >
                      {item.name || t('untitled')}
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
              className="h-6 max-w-[240px] truncate px-2 py-0 font-normal text-foreground"
              onClick={() => {
                navigate(`/s/${shareId}/${rootItem.id}`);
              }}
            >
              {rootItem.name || t('untitled')}
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
                    navigate(`/s/${shareId}/${item.id}`);
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
        <BreadcrumbItem>
          <BreadcrumbPage
            title={currentItem.name || t('untitled')}
            className="line-clamp-1 max-w-[240px] truncate pl-2 font-normal text-foreground"
          >
            {currentItem.name || t('untitled')}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
