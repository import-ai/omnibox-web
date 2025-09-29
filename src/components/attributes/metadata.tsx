import { Text } from 'lucide-react';

export function Metadata({ metadata }: { metadata: Record<string, any> }) {
  return (
    <>
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex items-start gap-3">
          <Text className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground font-medium min-w-[80px]">
            {key}
          </span>
          <span className="text-foreground break-all">{String(value)}</span>
        </div>
      ))}
    </>
  );
}
