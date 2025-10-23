import { Sidebar, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';

import Content from './content';
import { FooterSidebar } from './footer';
import { Header } from './header';
import { Switcher } from './switcher';
import Setting from './switcher/setting';
import useContext from './useContext';

export default function MainSidebar() {
  const {
    data,
    expands,
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
    handleMenuMore,
    handleActiveKey,
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
          expanding={expanding}
          editingKey={editingKey}
          resourceId={resourceId}
          onExpand={handleExpand}
          onDelete={handleDelete}
          onCreate={handleCreate}
          onUpload={handleUpload}
          namespaceId={namespaceId}
          onMenuMore={handleMenuMore}
          onActiveKey={handleActiveKey}
        />
        <FooterSidebar />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <Setting />
    </>
  );
}
