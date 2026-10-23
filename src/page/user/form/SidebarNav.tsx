import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  value: string;
  onChange: (value: string) => void;
  items: Array<{
    label: string;
    value: string;
  }>;
}

export function SidebarNav(props: SidebarNavProps) {
  const { value, onChange, items } = props;

  return (
    <nav className="flex flex-wrap gap-1 lg:flex-col">
      {items.map(item => (
        <Button
          key={item.value}
          variant="ghost"
          onClick={() => onChange(item.value)}
          className={cn(
            'justify-start px-3 sm:px-4',
            item.value === value
              ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent'
              : 'hover:bg-transparent hover:underline'
          )}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
