interface IProps {
  className?: string;
}

export function TextIcon(props: IProps) {
  const { className } = props;

  return (
    <svg
      viewBox="0 0 1024 1024"
      width="24"
      height="24"
      fill="currentColor"
      className={className}
    >
      <path d="M395.2 548.6H468V778c0 4.4 3.6 8 8 8h65.9c4.4 0 8-3.6 8-8V548.6h73.4c4.4 0 8-3.5 8-7.9l0.5-53.1c0-4.4-3.6-8.1-8-8.1H395.2c-4.4 0-8 3.6-8 8v53.1c0 4.4 3.6 8 8 8zM854.1 288.1L638.9 72.8c-6-6-14.2-9.4-22.7-9.4H191.5c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V310.7c0-8.5-3.4-16.6-9.4-22.6zM637.5 173.2l116.1 116.2H637.5V173.2z m154 714.2h-560v-752h334v174c0 28.7 23.3 52 52 52h174v526z" />
    </svg>
  );
}
