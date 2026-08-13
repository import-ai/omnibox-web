import { useTranslation } from 'react-i18next';

import { SidebarMenuItem } from '@/components/ui/Sidebar';

interface FolderEmptyStateProps {
  depth: number;
  type: 'rss_folder' | 'smart_folder';
}

export default function FolderEmptyState({
  depth,
  type,
}: FolderEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <SidebarMenuItem>
      <div
        className="py-1.5 text-sm text-muted-foreground"
        style={{ paddingLeft: depth * 20 + 28 }}
      >
        {t(`${type}.empty`)}
      </div>
    </SidebarMenuItem>
  );
}
