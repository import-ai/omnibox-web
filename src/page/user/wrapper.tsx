import React from 'react';
import { GalleryVerticalEnd } from 'lucide-react';

interface WrapperPageProps {
  children: React.ReactNode;
}

export default function WrapperPage(props: WrapperPageProps) {
  const { children } = props;

  return (
    <div className="grid min-h-svh">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex justify-center gap-2">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Import AI
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
    </div>
  );
}
