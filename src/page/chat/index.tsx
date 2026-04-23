import { SidebarInset } from '@/components/ui/sidebar';

import Header from './header';
import Page from './page';

export default function Chat() {
  return (
    <SidebarInset className="m-0 h-full min-h-0 rounded-none bg-white dark:bg-background md:m-[8px] md:h-[calc(100svh-16px)] md:rounded-2xl">
      <Header />
      <Page />
    </SidebarInset>
  );
}
