import { type Citation } from '@/page/chat/types/chat-response';
import React from 'react';
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
import { CitationCard } from '@/page/chat/messages/citations/citation-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm">
          {citations.length} Citations <ChevronRight />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Search Results</SheetTitle>
          <SheetDescription></SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-full bottom-4">
          {citations.map((citation, index) => {
            return (
              <React.Fragment key={index}>
                <CitationCard index={index} citation={citation} />
                {index < citations.length - 1 && <Separator />}
              </React.Fragment>
            );
          })}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
