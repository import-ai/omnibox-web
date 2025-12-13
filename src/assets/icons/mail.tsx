interface MailIconProps {
  className?: string;
}

export function MailIcon({ className }: MailIconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.6666 3.33337H3.33329C2.41282 3.33337 1.66663 4.07957 1.66663 5.00004V15C1.66663 15.9205 2.41282 16.6667 3.33329 16.6667H16.6666C17.5871 16.6667 18.3333 15.9205 18.3333 15V5.00004C18.3333 4.07957 17.5871 3.33337 16.6666 3.33337Z"
        fill="#60A5FA"
      />
      <path
        d="M18.3333 5.83337L10.8408 10.6059C10.5865 10.7536 10.2977 10.8313 10.0037 10.8313C9.70968 10.8313 9.42088 10.7536 9.16663 10.6059L1.66663 5.83337"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
