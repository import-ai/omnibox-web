import { SidebarInset } from '@/components/ui/sidebar';

import Header from './header';
import Page from './page';

export default function Chat() {
  return (
    <SidebarInset className="m-[8px] bg-white rounded-[16px]">
      <Header />
      <Page />
    </SidebarInset>
  );
}
