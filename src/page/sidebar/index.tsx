import { useTranslation } from 'react-i18next';

import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Sidebar, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';

import Content from './content';
import { FooterSidebar } from './footer';
import { Header } from './header';
import { Switcher } from './switcher';
import Setting from './switcher/setting';
import useContext from './useContext';

export default function MainSidebar() {
  const { t } = useTranslation();
  const {
    data,
    expands,
    progress,
    chatPage,
    expanding,
    editingKey,
    resourceId,
    handleDrop,
    namespaceId,
    handleExpand,
    handleDelete,
    handleCreate,
    handleUpload,
    deleteDialog,
    handleActiveKey,
    setDeleteDialog,
    handleDeleteSuccess,
    handleRestoreSuccess,
  } = useContext();

  return (
    <>
      <Sidebar className="border-none">
        <SidebarHeader className="pt-[16px] gap-[10px] pr-0">
          <Switcher namespaceId={namespaceId} />
          <Header active={chatPage} onActiveKey={handleActiveKey} />
        </SidebarHeader>
        <Content
          data={data}
          expands={expands}
          onDrop={handleDrop}
          progress={progress}
          expanding={expanding}
          editingKey={editingKey}
          resourceId={resourceId}
          onExpand={handleExpand}
          onDelete={handleDelete}
          onCreate={handleCreate}
          onUpload={handleUpload}
          namespaceId={namespaceId}
          onActiveKey={handleActiveKey}
        />
        <FooterSidebar />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <Setting />
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        title={t('resource.delete.dialog.title')}
        description="resource.delete.dialog.description"
        itemTitle={deleteDialog.title}
        deleteUrl={`/namespaces/${namespaceId}/resources/${deleteDialog.id}`}
        restoreUrl={`/namespaces/${namespaceId}/resources/${deleteDialog.id}/restore`}
        successMessage={t('resource.deleted')}
        successDescription={t('resource.deleted_description')}
        onOpenChange={open => setDeleteDialog({ ...deleteDialog, open })}
        onSuccess={handleDeleteSuccess}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </>
  );
}
