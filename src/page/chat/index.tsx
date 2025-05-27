import Page from './page';
import Header from './header';
import { SidebarInset } from '@/components/ui/sidebar';

export default function Chat() {
  return (
    <SidebarInset>
      <Header />
      <Page />
    </SidebarInset>
  );
}
