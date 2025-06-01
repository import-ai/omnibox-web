import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CitationIconProps } from '@/page/chat/messages/citations/citation-icon.tsx';
import { Badge } from '@/components/ui/badge.tsx';

export function CitationCard(props: CitationIconProps) {
  const { citation, index } = props;

  return (
    <a
      href={
        citation.link.startsWith('http') ? citation.link : '../' + citation.link
      }
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className="w-full max-w-sm hover:bg-primary-foreground my-2">
        <CardHeader className="pb-1">
          <CardTitle>{citation.title}</CardTitle>
          <CardDescription>{citation.snippet}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Badge
            variant="secondary"
            className="rounded-full px-1 hover:text-primary-foreground hover:bg-primary"
          >
            {index + 1}
          </Badge>
        </CardFooter>
      </Card>
    </a>
  );
}
