import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import React from 'react';
import { Resource } from '@/interface';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface IProps {
  namespaceId: string;
  resource: Resource | null;
}

export default function BreadcrumbMain(props: IProps) {
  const { resource, namespaceId } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!resource || !resource.path) {
    return null;
  }
  const data = resource.path;
  const size = data.length;

  return (
    <Breadcrumb className="ml-[-10px]">
      <BreadcrumbList className="gap-0 sm:gap-0">
        {data.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <BreadcrumbSeparator className="[&>svg]:size-3 opacity-30">
                /
              </BreadcrumbSeparator>
            )}
            {index >= size - 1 ? (
              <BreadcrumbItem className="font-normal text-foreground line-clamp-1 pl-2 truncate max-w-[240px]">
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
