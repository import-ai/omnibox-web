import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
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
  const data = resource.path;
  const size = data.length - 1;

  return (
    <Breadcrumb className={cn('ml-[-10px]', className)}>
      <BreadcrumbList className="gap-0 sm:gap-0">
        {data.slice(1).map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <BreadcrumbSeparator className="[&>svg]:size-3 opacity-30">
                /
              </BreadcrumbSeparator>
            )}
            {index >= size - 1 ? (
              <BreadcrumbItem
                title={item.name || t('untitled')}
                className="font-normal text-foreground line-clamp-1 pl-2 truncate max-w-[240px]"
              >
                {item.name || t('untitled')}
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <Button
                  variant="ghost"
                  className="h-6 px-2 py-0 font-normal text-foreground truncate max-w-[240px]"
                  onClick={() => {
                    navigate(`/${namespaceId}/${item.id}`);
                  }}
                >
                  {item.name || t('untitled')}
                </Button>
              </BreadcrumbItem>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
