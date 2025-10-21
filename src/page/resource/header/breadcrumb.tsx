import React from 'react';
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
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Resource } from '@/interface';
import { cn } from '@/lib/utils';

interface IProps {
  className?: string;
  namespaceId: string;
  resource: Resource | null;
}

export default function BreadcrumbMain(props: IProps) {
  const { className, resource, namespaceId } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!resource || !Array.isArray(resource.path) || resource.path.length <= 1) {
    return null;
  }
  const data = resource.path.slice(1); // Remove first item (root)

  // If 3 or fewer items, display all normally
  if (data.length <= 3) {
    const size = data.length - 1;
    return (
      <Breadcrumb className={cn('ml-[-10px]', className)}>
        <BreadcrumbList className="gap-0 sm:gap-0">
          {data.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <BreadcrumbSeparator />}
              {index >= size ? (
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
                      className="h-6 px-2 py-0 font-normal text-foreground truncate max-w-[240px]"
                      onClick={() => {
                        navigate(`/${namespaceId}/${item.id}`);
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
    <Breadcrumb className={cn('ml-[-10px]', className)}>
      <BreadcrumbList className="gap-0 sm:gap-0">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Button
              variant="ghost"
              className="h-6 px-2 py-0 font-normal text-foreground truncate max-w-[240px]"
              onClick={() => {
                navigate(`/${namespaceId}/${rootItem.id}`);
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
        <BreadcrumbItem>
          <BreadcrumbPage
            title={currentItem.name || t('untitled')}
            className="font-normal text-foreground line-clamp-1 pl-2 truncate max-w-[240px]"
          >
            {currentItem.name || t('untitled')}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
