import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import {
  Sidebar,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useIsMobile } from '@/hooks/use-mobile';
import SettingModal from '@/page/settings';
import { TrashPanel } from '@/page/trash';

import { FooterSidebar } from './components/footer';
import { Header } from './components/header';
import { Switcher } from './components/namespace-switcher';
import ResourceTree from './components/resource-tree';
import { CreateFolderDialog } from './components/resource-tree/create-folder-dialog';
import { useSidebarEvents } from './hooks/use-sidebar-events';
import { useSidebarInit } from './hooks/use-sidebar-init';
import { useSidebarStore } from './store';

export default function MainSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { namespaceId } = useSidebarInit();
  useSidebarEvents(namespaceId);
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTargetId = useSidebarStore(s => s.currentUploadTargetId);
  const createFolderTargetId = useSidebarStore(s => s.createFolderTargetId);
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
      toast.error((err as Error)?.message || t('upload.failed'));
    } finally {
      if (globalFileInputRef.current) {
        globalFileInputRef.current.value = '';
      }
    }
  };
  const handleActiveKey = (id: string, edit?: boolean) => {
    if (edit) {
      navigate(`/${namespaceId}/${id}/edit`, { state: { fromSidebar: true } });
    } else if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <React.Fragment>
      <Sidebar className="border-none">
        <SidebarHeader className="gap-2.5 pr-0 pt-4">
          <Switcher namespaceId={namespaceId} />
          <Header onActiveKey={handleActiveKey} />
        </SidebarHeader>
        <ResourceTree namespaceId={namespaceId}>
          <TrashPanel />
        </ResourceTree>
        <CreateFolderDialog
          open={!!createFolderTargetId}
          onOpenChange={open => {
            if (!open) useSidebarStore.getState().closeCreateFolderDialog();
          }}
          onConfirm={async folderName => {
            if (!createFolderTargetId) {
              return;
            }
            const store = useSidebarStore.getState();
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
        <FooterSidebar />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <SettingModal />
    </React.Fragment>
  );
}
