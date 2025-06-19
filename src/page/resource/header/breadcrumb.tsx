import { Resource } from '@/interface';
import { useTranslation } from 'react-i18next';
import { Folder, File, SlashIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface IProps {
  resource: Resource | null;
}

export default function BreadcrumbMain(props: IProps) {
  const { resource } = props;
  const { t } = useTranslation();

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1 sm:gap-2">
        <BreadcrumbItem>
          <BreadcrumbPage className="line-clamp-1">Home</BreadcrumbPage>
        </BreadcrumbItem>
        {!resource ? null : (
          <>
            <BreadcrumbSeparator className="[&>svg]:size-3 opacity-30">
              <SlashIcon />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <div className="flex items-center gap-1">
                {resource.resource_type === 'folder' ? (
                  <Folder className="size-4" />
                ) : (
                  <File className="size-4" />
                )}
                <BreadcrumbPage className="line-clamp-1">
                  {resource.name || t('untitled')}
                </BreadcrumbPage>
              </div>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
