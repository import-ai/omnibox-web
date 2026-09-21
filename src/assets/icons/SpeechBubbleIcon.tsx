interface SpeechBubbleIconProps {
  className?: string;
}

export default function SpeechBubbleIcon({ className }: SpeechBubbleIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      width="418"
      height="71"
      viewBox="0 0 418 71"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M50.84 0.641213L383.215 0.499973C402.253 0.492011 417.361 15.9156 416.96 34.9494C416.56 53.9357 400.875 69.3521 381.883 69.427L147.38 70.3497L115.268 70.3585L83.749 70.367L4.66801 70.3498L4.66703 70.3498C0.309228 70.3599 -1.10309 64.5805 2.73056 62.4257L8.69275 59.0743C10.8357 57.8699 12.2253 55.6553 12.3649 53.2216L13.3472 36.0865C14.481 16.3146 31.0511 0.649622 50.84 0.641213Z" />
    </svg>
  );
}
