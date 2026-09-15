import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
import { navigateToResource } from '@/page/resource/resourceNavigation';

interface IProps {
  className?: string;
  namespaceId: string;
  path?: PathItem[];
}

export default function BreadcrumbMain(props: IProps) {
  const { className, namespaceId, path = [] } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (path.length <= 1) {
    return null;
  }
  const data = path.slice(1); // Remove first item (root)

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
                        navigateToResource(
                          navigate,
                          `/${namespaceId}/${item.id}`
                        );
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
                navigateToResource(navigate, `/${namespaceId}/${rootItem.id}`);
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
                    navigateToResource(navigate, `/${namespaceId}/${item.id}`);
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
