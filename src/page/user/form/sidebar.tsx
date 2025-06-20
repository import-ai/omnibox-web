import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      {items.map((item) => (
        <Button
          key={item.value}
          variant="ghost"
          onClick={() => onChange(item.value)}
          className={cn(
            'justify-start px-3 sm:px-4',
            item.value === value
              ? 'bg-muted hover:bg-muted dark:bg-[#666666] dark:hover:bg-[#666666]'
              : 'hover:bg-transparent hover:underline',
          )}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
