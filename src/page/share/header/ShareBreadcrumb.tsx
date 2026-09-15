import * as React from 'react';
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
import { PathItem } from '@/interface';
import { cn } from '@/lib/utils';

interface IProps {
  className?: string;
  path?: PathItem[];
  fallbackId?: string;
  fallbackName?: string;
}

export default function ShareBreadcrumb(props: IProps) {
  const { className, path = [], fallbackId, fallbackName } = props;
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const shareId = params.share_id;

  const data =
    path.length > 0 || !fallbackId
      ? path
      : [{ id: fallbackId, name: fallbackName || '' }];

  if (data.length <= 0) {
    return (
      <Breadcrumb className={cn('min-w-0 max-w-full', className)}>
        <BreadcrumbList className="min-w-0 flex-nowrap gap-0 overflow-hidden sm:gap-0">
          <BreadcrumbItem className="min-w-0 flex-1 overflow-hidden">
            <BreadcrumbPage
              title={fallbackName || t('untitled')}
              className="block min-w-0 truncate pl-2 font-normal text-foreground"
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
      <Breadcrumb className={cn('min-w-0 max-w-full', className)}>
        <BreadcrumbList className="min-w-0 flex-nowrap gap-0 overflow-hidden sm:gap-0">
          {data.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
              {index >= size ? (
                <BreadcrumbItem className="min-w-0 flex-1 overflow-hidden">
                  <BreadcrumbPage
                    title={item.name || t('untitled')}
                    className="block min-w-0 truncate pl-2 font-normal text-foreground"
                  >
                    {item.name || t('untitled')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem className="min-w-0 shrink">
                  <BreadcrumbLink asChild>
                    <Button
                      variant="ghost"
                      className="h-6 max-w-[7rem] justify-start overflow-hidden px-2 py-0 font-normal text-foreground sm:max-w-[240px]"
                      onClick={() => {
                        navigate(`/s/${shareId}/${item.id}`);
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
    <Breadcrumb className={cn('min-w-0 max-w-full', className)}>
      <BreadcrumbList className="min-w-0 flex-nowrap gap-0 overflow-hidden sm:gap-0">
        <BreadcrumbItem className="min-w-0 shrink">
          <BreadcrumbLink asChild>
            <Button
              variant="ghost"
              className="h-6 max-w-[7rem] justify-start overflow-hidden px-2 py-0 font-normal text-foreground sm:max-w-[240px]"
              onClick={() => {
                navigate(`/s/${shareId}/${rootItem.id}`);
              }}
            >
              <span className="min-w-0 truncate text-left">
                {rootItem.name || t('untitled')}
              </span>
            </Button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0" />
        <BreadcrumbItem className="shrink-0">
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
        <BreadcrumbSeparator className="shrink-0" />
        <BreadcrumbItem className="min-w-0 flex-1 overflow-hidden">
          <BreadcrumbPage
            title={currentItem.name || t('untitled')}
            className="block min-w-0 truncate pl-2 font-normal text-foreground"
          >
            {currentItem.name || t('untitled')}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
