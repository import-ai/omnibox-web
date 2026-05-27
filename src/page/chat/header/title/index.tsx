import { BreadcrumbPage } from '@/components/ui/Breadcrumb';

import Title, { ITitleProps } from './HeaderTitle';

export default function ChatHeaderTitle(props: ITitleProps) {
  return (
    <BreadcrumbPage className="line-clamp-1">
      <Title {...props} editable />
    </BreadcrumbPage>
  );
}
