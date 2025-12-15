import { Text } from 'lucide-react';

export function Metadata({ metadata }: { metadata: Record<string, any> }) {
  return (
    <>
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex items-start gap-3">
          <Text className="size-4 text-[#8F959E]" />
          <span className="text-[#8F959E] min-w-[80px]">{key}</span>
          <span className="text-[#585D65] dark:text-white break-all">
            {String(value)}
          </span>
        </div>
      ))}
    </>
  );
}
