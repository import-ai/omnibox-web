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
import { type Citation } from '@/page/chat/core/types/chat-response';
import { CitationCard } from '@/page/chat/messages/citations/citation-card';

interface IProps {
  index: number;
  citations: Citation[];
}

export function CitationsSheet(props: IProps) {
  const { index, citations } = props;
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en-US';
  const plural = isEnglish && citations.length > 1 ? 's' : '';

  if (citations.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[#eaecf3] hover:border-[#f7f8fa] dark:border-[#4d4e4f] dark:bg-transparent dark:hover:border-[#626264] dark:hover:bg-[#404040]"
        >
          {citations.length} {t('chat.citations')}
          {plural} <ChevronRight />
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
        <div className="h-[calc(100svh-53px)] overflow-y-auto">
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
