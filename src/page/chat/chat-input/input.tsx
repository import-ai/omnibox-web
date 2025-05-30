import { Input } from '@/components/ui/input';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  onAction: (action?: 'stop' | 'disabled') => void;
}

export default function ChatInput(props: IProps) {
  const { value, onChange, onAction } = props;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        onAction();
      }
    }
  };

  return (
    <div className="mt-1 mb-5">
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="p-0 border-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:shadow-none hover:border-transparent hover:shadow-none"
      />
    </div>
  );
}
