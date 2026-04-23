import { REGEXP_ONLY_DIGITS } from 'input-otp';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
}: OtpInputProps) {
  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (newValue.length === 6 && onComplete) {
      onComplete(newValue);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <InputOTP
        maxLength={6}
        value={value}
        onChange={handleChange}
        pattern={REGEXP_ONLY_DIGITS}
        disabled={disabled}
      >
        <InputOTPGroup>
          <InputOTPSlot
            index={0}
            className="border-neutral-200 dark:border-neutral-700"
          />
          <InputOTPSlot
            index={1}
            className="border-neutral-200 dark:border-neutral-700"
          />
          <InputOTPSlot
            index={2}
            className="border-neutral-200 dark:border-neutral-700"
          />
          <InputOTPSlot
            index={3}
            className="border-neutral-200 dark:border-neutral-700"
          />
          <InputOTPSlot
            index={4}
            className="border-neutral-200 dark:border-neutral-700"
          />
          <InputOTPSlot
            index={5}
            className="border-neutral-200 dark:border-neutral-700"
          />
        </InputOTPGroup>
      </InputOTP>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
