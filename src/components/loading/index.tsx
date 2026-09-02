import { Spinner } from '@/components/ui/Spinner';

interface LoadingProps {
  label?: string;
}

export default function Loading({ label }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
      <Spinner className="size-6 text-gray-400" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
