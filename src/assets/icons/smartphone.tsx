interface SmartphoneIconProps {
  className?: string;
}

export function SmartphoneIcon({ className }: SmartphoneIconProps) {
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
        d="M14.1666 1.66663H5.83329C4.91282 1.66663 4.16663 2.41282 4.16663 3.33329V16.6666C4.16663 17.5871 4.91282 18.3333 5.83329 18.3333H14.1666C15.0871 18.3333 15.8333 17.5871 15.8333 16.6666V3.33329C15.8333 2.41282 15.0871 1.66663 14.1666 1.66663Z"
        fill="#A3A3A3"
      />
      <path
        d="M10 15H10.0083"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
