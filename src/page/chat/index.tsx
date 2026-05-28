import { SidebarInset } from '@/components/ui/Sidebar';

import Page from './ChatPage';
import Header from './header';

export default function Chat() {
  return (
    <SidebarInset className="m-0 md:m-[8px] bg-white rounded-none md:rounded-2xl dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)]">
      <Header />
      <Page />
    </SidebarInset>
  );
}
