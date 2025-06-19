import Actions from '../actions';
import App from '@/hooks/app.class';
import Breadcrumb from './breadcrumb';
import { Resource } from '@/interface';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface IProps {
  app: App;
  wide: boolean;
  onWide: (wide: boolean) => void;
  forbidden: boolean;
  resource: Resource | null;
}

export default function Header(props: IProps) {
  const { app, wide, onWide, forbidden, resource } = props;

  return (
    <header className="sticky z-[30] top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb resource={resource} />
      </div>
      <div className="ml-auto pr-3">
        <Actions
          app={app}
          wide={wide}
          onWide={onWide}
          resource={resource}
          forbidden={forbidden}
        />
      </div>
    </header>
  );
}
