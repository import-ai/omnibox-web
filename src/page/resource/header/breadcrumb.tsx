import { cn } from '@/lib/utils';
import { SlashIcon } from 'lucide-react';
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
  resource: Resource | null;
}

export default function BreadcrumbMain(props: IProps) {
  const { resource } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!resource || !resource.path) {
    return null;
  }
  const data = resource.path;
  const size = data.length;

  return (
    <Breadcrumb
      className={cn({
        'ml-[-10px]': size > 1,
      })}
    >
      <BreadcrumbList className="gap-1 sm:gap-2">
        {data.map((item, index) => (
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
                    navigate(`/${resource.namespace_id}/${item.id}`);
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
