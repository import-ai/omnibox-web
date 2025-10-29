import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface IProps {
  currentIndex: number;
  totalCount: number;
  onNavigate: (index: number) => void;
}

export default function BranchNavigator(props: IProps) {
  const { currentIndex, totalCount, onNavigate } = props;

  if (totalCount <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handlePrev}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[3rem] text-center">
        {currentIndex + 1} / {totalCount}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handleNext}
        disabled={currentIndex === totalCount - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
