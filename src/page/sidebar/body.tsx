import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';

import ResourceTree from './components/resource-tree';
import { CreateFolderDialog } from './components/resource-tree/createFolderDialog';
import { useSidebarEvents } from './hooks/useSidebarEvents';
import { useSidebarInit } from './hooks/useSidebarInit';
import { useSidebarStore } from './store';

interface IProps {
  resourceId: string;
  namespaceId: string;
}

export function BodyForSidebar(props: IProps) {
  const { namespaceId, resourceId } = props;
  useSidebarInit({ namespaceId, resourceId });
  useSidebarEvents(namespaceId);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTargetId = useSidebarStore(
    s => s.dialogs.currentUploadTargetId
  );
  const createFolderTargetId = useSidebarStore(
    s => s.dialogs.createFolderTargetId
  );
  const handleGlobalFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || !currentUploadTargetId) return;

    try {
      const id = await useSidebarStore
        .getState()
        .uploadFiles(currentUploadTargetId, files);
      useSidebarStore.getState().activate(id);
      navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
      toast.success(t('upload.success', { count: files.length }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : err || t('upload.failed');
      toast(message, { position: 'bottom-right' });
    } finally {
      if (globalFileInputRef.current) {
        globalFileInputRef.current.value = '';
      }
    }
  };

  return (
    <React.Fragment>
      <ResourceTree namespaceId={namespaceId} />
      <CreateFolderDialog
        open={!!createFolderTargetId}
        onOpenChange={open => {
          if (!open) {
            useSidebarStore.getState().closeCreateFolderDialog();
          }
        }}
        onConfirm={async folderName => {
          if (!createFolderTargetId) {
            return;
          }
          const store = useSidebarStore.getState();
          try {
            const id = await store.create(
              createFolderTargetId,
              'folder',
              folderName
            );
            store.activate(id);
            store.closeCreateFolderDialog();
            navigate(`/${namespaceId}/${id}`, {
              state: { fromSidebar: true },
            });
          } catch {
            // request.ts handles backend error toasts.
          }
        }}
      />
      <Input
        multiple
        type="file"
        className="hidden"
        ref={globalFileInputRef}
        id="global-sidebar-file-input"
        accept={ALLOW_FILE_EXTENSIONS}
        onChange={handleGlobalFileUpload}
      />
    </React.Fragment>
  );
}
