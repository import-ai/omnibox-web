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
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {items.map((item) => (
        <Button
          key={item.value}
          variant="ghost"
          className={cn(
            item.value === value
              ? 'bg-muted hover:bg-muted'
              : 'hover:bg-transparent hover:underline',
            'justify-start'
          )}
          onChange={() => {
            onChange(item.value);
          }}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
