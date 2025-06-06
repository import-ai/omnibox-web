import Title, { ITitleProps } from './title';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';

export default function ChatHeaderTitle(props: ITitleProps) {
  return (
    <BreadcrumbPage className="line-clamp-1">
      <Title {...props} editable />
    </BreadcrumbPage>
  );
}
