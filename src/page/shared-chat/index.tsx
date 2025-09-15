import { SidebarInset } from '@/components/ui/sidebar';

import Header from './header';
import Page from './page';

export default function SharedChat() {
  return (
    <SidebarInset>
      <Header />
      <Page />
    </SidebarInset>
  );
}
