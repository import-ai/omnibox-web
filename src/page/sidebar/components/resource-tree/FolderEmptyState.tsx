import { useTranslation } from 'react-i18next';

import { SidebarMenuItem } from '@/components/ui/Sidebar';

interface FolderEmptyStateProps {
  depth: number;
}

export default function FolderEmptyState({ depth }: FolderEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <SidebarMenuItem>
      <div
        className="py-1.5 text-sm text-muted-foreground"
        style={{ paddingLeft: depth * 20 + 28 }}
      >
        {t('sidebar.folder_empty')}
      </div>
    </SidebarMenuItem>
  );
}
