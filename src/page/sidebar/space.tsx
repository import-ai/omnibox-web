import Tree from './tree';
import { useRef } from 'react';
import { Input } from '@/components/input';
import { IResourceData } from '@/interface';
import { IResourceProps } from './dropdown';
import { useTranslation } from 'react-i18next';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { LoaderCircle, MoreHorizontal } from 'lucide-react';
import {
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

interface IProps extends IResourceProps {}

export default function Space(props: IProps) {
  const { data, editingKey, space_type, namespace_id, onCreate, onUpload } =
    props;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSelect = () => {
    fileInputRef.current?.click();
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }
    onUpload(namespace_id, data.space_type, data.id, e.target.files[0]).finally(
      () => {
        fileInputRef.current!.value = '';
      },
    );
  };

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>{t(space_type)}</SidebarGroupLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="my-1.5 right-2 focus-visible:outline-none focus-visible:ring-transparent">
              {data.id === editingKey ? (
                <LoaderCircle className="transition-transform animate-spin" />
              ) : (
                <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent" />
              )}
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" sideOffset={10} align="start">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                onCreate(namespace_id, space_type, data.id, 'doc');
              }}
            >
              {t('actions.create_file')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                onCreate(namespace_id, space_type, data.id, 'folder');
              }}
            >
              {t('actions.create_folder')}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleSelect}>
              {t('actions.upload_file')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleUpload}
          accept={ALLOW_FILE_EXTENSIONS}
        />
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {Array.isArray(data.children) &&
            data.children.length > 0 &&
            data.children.map((item: IResourceData) => (
              <Tree {...props} data={item} key={item.id} />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
