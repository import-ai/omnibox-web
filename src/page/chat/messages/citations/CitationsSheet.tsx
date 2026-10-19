import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/Sheet';
import { type Citation } from '@/page/chat/core/types/chatResponse';
import { CitationCard } from '@/page/chat/messages/citations/CitationCard';
import { useShareChatOnly } from '@/page/share/ShareChatOnlyContext';

import {
  DetailLoadState,
  useMessageDetails,
} from '../../conversation/MessageDetailsContext';

interface IProps {
  index: number;
  citations: Citation[];
}

export function CitationsSheet(props: IProps) {
  const { index } = props;
  const [loaded, setLoaded] = useState<Citation[]>([]);
  const citations = props.citations.map(citation => ({
    ...citation,
    ...loaded.find(
      item =>
        item.id === citation.id &&
        item.source_message_id === citation.source_message_id
    ),
  }));
  const details = useMessageDetails();
  const load = async () => {
    const ids = props.citations.flatMap(citation =>
      citation.source_message_id ? [citation.source_message_id] : []
    );
    const result = await details.load(ids);
    if (result)
      setLoaded(
        props.citations.map(citation => ({
          ...citation,
          ...result[citation.source_message_id ?? '']?.attrs?.citations?.find(
            item => item.id === citation.id
          ),
        }))
      );
  };
  const { t, i18n } = useTranslation();
  const chatOnly = useShareChatOnly();
  const [open, setOpen] = useState(false);
  const isEnglish = i18n.language === 'en-US';
  const plural = isEnglish && citations.length > 1 ? 's' : '';

  // The trigger only exists to open the cited resources, which a chat-only
  // share does not surface.
  if (citations.length === 0 || chatOnly) {
    return null;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={value => {
        setOpen(value);
        if (value) void load();
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[#eaecf3] dark:border-[#4d4e4f] dark:bg-transparent hover:border-[#f7f8fa] dark:hover:border-[#626264] dark:hover:bg-[#404040]"
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
        <div className="overflow-y-auto h-[calc(100svh-53px)]">
          <DetailLoadState
            {...details}
            retry={() => {
              void load();
            }}
          />
          {citations.map((citation, i) => (
            <CitationCard
              key={index + i}
              index={citation.index ?? index + i}
              citation={citation}
              onOpenResource={() => setOpen(false)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
