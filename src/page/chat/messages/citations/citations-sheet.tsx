import { type Citation } from '@/page/chat/types/chat-response';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CitationCard } from '@/page/chat/messages/citations/citation-card.tsx';

interface IProps {
  citations: Citation[];
}

export function CitationsSheet(props: IProps) {
  const { citations } = props;

  if (citations.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="secondary" size="sm">
          {citations.length} Citations <ChevronRight />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Search Results</SheetTitle>
          <SheetDescription>
            {citations.map((citation, index) => {
              return <CitationCard index={index} citation={citation} />;
            })}
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
