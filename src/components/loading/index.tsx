import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <LoaderCircle className="size-6 animate-spin text-gray-400" />
    </div>
  );
}
