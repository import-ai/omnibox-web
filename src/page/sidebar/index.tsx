import Content from './content';
import { Header } from './header';
import { Switcher } from './switcher';
import useContext from './useContext';
import { Sidebar, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';

export default function MainSidebar() {
  const {
    data,
    expands,
    chatPage,
    expanding,
    editingKey,
    resourceId,
    namespaceId,
    handleExpand,
    handleDelete,
    handleCreate,
    handleUpload,
    handleMenuMore,
    handleActiveKey,
  } = useContext();

  return (
    <Sidebar>
      <SidebarHeader>
        <Switcher namespaceId={namespaceId} />
        <Header active={chatPage} onActiveKey={handleActiveKey} />
      </SidebarHeader>
      <Content
        data={data}
        expands={expands}
        expanding={expanding}
        editingKey={editingKey}
        resourceId={resourceId}
        onExpand={handleExpand}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onUpload={handleUpload}
        onMenuMore={handleMenuMore}
        onActiveKey={handleActiveKey}
      />
      <SidebarRail />
    </Sidebar>
  );
}
