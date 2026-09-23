interface CopilotSpeechBubbleIconProps {
  className?: string;
}

export default function CopilotSpeechBubbleIcon({
  className,
}: CopilotSpeechBubbleIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      overflow="visible"
      width="181"
      height="72"
      viewBox="0 0 181 72"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.8"
        d="M45.9475 0.54221L145.441 0.499931C164.716 0.491889 180.013 16.1082 179.606 35.3797C179.202 54.5386 163.424 70.1206 144.258 70.287L63.691 70.9852L49.905 70.9871L36.369 70.987L6.59089 70.988C1.75098 70.9881 -1.11681 65.6999 1.47909 61.5607L6.95407 52.8309C8.31671 50.6582 9.01955 48.1461 8.97446 45.6081L8.84446 38.2934C8.47876 17.694 25.3276 0.550972 45.9475 0.54221Z"
        strokeLinecap="round"
      />
    </svg>
  );
}
