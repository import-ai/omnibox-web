import { SidebarInset } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';

import { InviteReferralContent } from './InviteReferralContent';

export default function InviteReferralPage() {
  return (
    <SidebarInset
      className={cn(
        'min-h-0 !min-h-0 max-h-full min-w-0 h-full overflow-hidden bg-white dark:bg-[#262626] md:rounded-2xl',
        'm-0 rounded-none md:m-[8px] md:h-[calc(100svh-16px)]'
      )}
    >
      <InviteReferralContent />
    </SidebarInset>
  );
}
