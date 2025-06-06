import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type Citation } from '@/page/chat/types/chat-response';
import { CitationCard } from '@/page/chat/messages/citations/citation-card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface IProps {
  citations: Citation[];
}

export function CitationsSheet(props: IProps) {
  const { citations } = props;
  const { t } = useTranslation();

  if (citations.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm">
          {citations.length} {t('chat.citations')} <ChevronRight />
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0">
        <SheetHeader className="px-4 py-3">
          <SheetTitle>{t('chat.citations_results')}</SheetTitle>
        </SheetHeader>
        <Separator className="dark:bg-gray-700" />
        <div className="overflow-y-auto h-[calc(100vh-53px)]">
          {citations.map((citation, index) => (
            <CitationCard index={index} key={index} citation={citation} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
