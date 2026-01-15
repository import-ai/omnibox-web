import { SidebarInset } from '@/components/ui/sidebar';

import Header from './header';
import Page from './page';

export default function Chat() {
  return (
    <SidebarInset className="m-0 md:m-[8px] bg-white rounded-none md:rounded-2xl dark:bg-background min-h-0 h-[calc(100svh-16px)]">
      <Header />
      <Page />
    </SidebarInset>
  );
}
