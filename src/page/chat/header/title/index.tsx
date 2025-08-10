import { BreadcrumbPage } from '@/components/ui/breadcrumb';

import Title, { ITitleProps } from './title';

export default function ChatHeaderTitle(props: ITitleProps) {
  return (
    <BreadcrumbPage className="line-clamp-1">
      <Title {...props} editable />
    </BreadcrumbPage>
  );
}
