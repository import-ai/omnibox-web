import React from 'react';
import { GalleryVerticalEnd } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface WrapperPageProps {
  children: React.ReactNode;
}

export default function WrapperPage(props: WrapperPageProps) {
  const { children } = props;

  return (
    <div className="grid min-h-svh">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex justify-center gap-2">
          <a
            href="/"
            className="flex items-center gap-2 font-medium text-black dark:text-white"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Import AI
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <Card>
              <CardHeader>
                <VisuallyHidden>
                  <CardTitle></CardTitle>
                  <CardDescription></CardDescription>
                </VisuallyHidden>
              </CardHeader>
              <CardContent>{children}</CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
