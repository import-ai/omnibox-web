import React from 'react';
import { GalleryVerticalEnd } from 'lucide-react';
import { ThemeToggle } from '@/components/toggle/theme';
import { LanguageToggle } from '@/components/toggle/language';
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from '@/components/ui/card';

interface WrapperPageProps {
  useCard?: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

export default function WrapperPage(props: WrapperPageProps) {
  const { useCard = true, extra, children } = props;

  return (
    <div className="grid min-h-svh dark:bg-[#262626]">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex justify-end gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex gap-2">
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
          {useCard ? (
            <div className="w-full max-w-sm flex flex-col gap-6">
              <Card className="dark:border-[#303030] dark:bg-[#171717]">
                <CardHeader className="hidden">
                  <CardTitle></CardTitle>
                  <CardDescription></CardDescription>
                </CardHeader>
                <CardContent>{children}</CardContent>
              </Card>
              {extra}
            </div>
          ) : (
            <div className="w-full max-w-sm flex flex-col gap-6">
              {children}
              {extra}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
