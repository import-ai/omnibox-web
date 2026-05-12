interface IProps {
  className?: string;
}

export function Arrow(props: IProps) {
  const { className } = props;

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.33337 5L10.3334 8L6.33337 11L6.33337 5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.33333"
        strokeLinejoin="round"
      />
    </svg>
  );
}
