import { cn } from '@/lib/utils';
import { http } from '@/lib/request';
import { sortMenuItems } from './utils';
import { SlashIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { IResourceData, Resource } from '@/interface';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface IProps {
  resource: Resource | null;
}

export default function BreadcrumbMain(props: IProps) {
  const { resource } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, onData] = useState<Array<IResourceData>>([]);
  const size = data.length;

  useEffect(() => {
    if (!resource) {
      return;
    }
    http
      .get(`/namespaces/${resource.namespace_id}/resources/${resource.id}/path`)
      .then(onData);
  }, [resource]);

  if (size <= 0) {
    return null;
  }

  return (
    <Breadcrumb
      className={cn({
        'ml-[-10px]': size > 1,
      })}
    >
      <BreadcrumbList className="gap-1 sm:gap-2">
        {sortMenuItems(data).map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <BreadcrumbSeparator className="[&>svg]:size-3 opacity-30">
                <SlashIcon />
              </BreadcrumbSeparator>
            )}
            {index >= size - 1 ? (
              <BreadcrumbItem className="font-normal text-foreground line-clamp-1">
                {item.name || t('untitled')}
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <Button
                  variant="ghost"
                  className="h-6 px-2 py-0 font-normal text-foreground"
                  onClick={() => {
                    navigate(`/${item.namespace_id}/${item.id}`);
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
