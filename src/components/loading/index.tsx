import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Spinner className="size-6 text-gray-400" />
    </div>
  );
}
