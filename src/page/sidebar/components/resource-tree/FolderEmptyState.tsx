import { useTranslation } from 'react-i18next';

import { SidebarMenuItem } from '@/components/ui/Sidebar';
import { Spinner } from '@/components/ui/Spinner';

interface FolderEmptyStateProps {
  depth: number;
  loading?: boolean;
  failed?: boolean;
}

export default function FolderEmptyState({
  depth,
  loading = false,
  failed = false,
}: FolderEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <SidebarMenuItem>
      <div
        className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground"
        style={{ paddingLeft: depth * 20 + 28 }}
      >
        {loading && <Spinner className="size-4" />}
        {t(
          loading
            ? 'rss_folder.loading'
            : failed
              ? 'rss_folder.load_failed'
              : 'sidebar.folder_empty'
        )}
      </div>
    </SidebarMenuItem>
  );
}
