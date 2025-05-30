import { CrossIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ArtifactCloseButton() {
  return (
    <Button
      data-testid="artifact-close-button"
      variant="outline"
      className="h-fit p-2 dark:hover:bg-zinc-700"
      onClick={() => {
        //
      }}
    >
      <CrossIcon size={18} />
    </Button>
  );
}
