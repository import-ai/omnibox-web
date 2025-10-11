import { Outlet } from 'react-router-dom';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { PublicShareInfo } from '@/interface';

import ShareSidebar from './sidebar';

interface IProps {
  resourceId: string;
  shareInfo: PublicShareInfo;
}

export function ShareLayout(props: IProps) {
  const { shareInfo, resourceId } = props;
  const { isMobile } = useSidebar();

  return (
    <>
      <ShareSidebar
        shareId={shareInfo.id}
        currentResourceId={resourceId!}
        rootResource={shareInfo.resource}
      />
      <main className="flex-1">
        {isMobile && <SidebarTrigger />}
        <Outlet />
      </main>
    </>
  );
}
