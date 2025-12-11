import { cn } from '@/lib/utils';

export function AppearanceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-[22px]', className)}
    >
      {/* Sun circle (left side) */}
      <circle
        cx="11"
        cy="11"
        r="4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Sun rays */}
      <line
        x1="11"
        y1="2"
        x2="11"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="18"
        x2="11"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="2"
        y1="11"
        x2="4"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="11"
        x2="20"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Diagonal rays */}
      <line
        x1="4.5"
        y1="4.5"
        x2="6"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="16"
        x2="17.5"
        y2="17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4.5"
        y1="17.5"
        x2="6"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="6"
        x2="17.5"
        y2="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Moon crescent overlay (right side) */}
      <path
        d="M14 8C14 8 16 9.5 16 12C16 14.5 14 16 14 16C15.5 15.5 17 13.5 17 11C17 8.5 15.5 6.5 14 8Z"
        fill="currentColor"
      />
    </svg>
  );
}
