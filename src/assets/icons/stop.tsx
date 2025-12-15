interface StopIconProps {
  className?: string;
}

export function StopIcon({ className }: StopIconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4.5" y="4.5" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}
