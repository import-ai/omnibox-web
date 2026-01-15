import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CitationCard } from '@/page/chat/messages/citations/citation-card';
import { type Citation } from '@/page/chat/types/chat-response';

interface IProps {
  index: number;
  citations: Citation[];
}

export function CitationsSheet(props: IProps) {
  const { index, citations } = props;
  const { t } = useTranslation();

  if (citations.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[#eaecf3] dark:border-[#4d4e4f] dark:bg-transparent hover:border-[#f7f8fa] dark:hover:border-[#626264] dark:hover:bg-[#404040]"
        >
          {citations.length} {t('chat.citations')} <ChevronRight />
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0">
        <SheetHeader className="px-4 py-3">
          <SheetTitle>{t('chat.citations_results')}</SheetTitle>
          <VisuallyHidden>
            <SheetDescription></SheetDescription>
          </VisuallyHidden>
        </SheetHeader>
        <Separator className="dark:bg-gray-700" />
        <div className="overflow-y-auto h-[calc(100vh-53px)]">
          {citations.map((citation, i) => (
            <CitationCard
              key={index + i}
              index={index + i}
              citation={citation}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
