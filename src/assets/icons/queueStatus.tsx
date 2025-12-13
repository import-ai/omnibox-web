import { SVGProps } from 'react';

export function QueueStatus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M17.5 10.0004C17.4999 11.5842 16.9984 13.1273 16.0674 14.4086C15.1364 15.6899 13.8237 16.6436 12.3174 17.133C10.8111 17.6224 9.1885 17.6223 7.6822 17.1329C6.17591 16.6434 4.86323 15.6896 3.9323 14.4083C3.00138 13.1269 2.49999 11.5838 2.5 9.99995C2.50001 8.41612 3.00142 6.87296 3.93237 5.59162C4.86331 4.31028 6.176 3.35654 7.6823 2.8671C9.1886 2.37766 10.8112 2.37763 12.3175 2.86703"
        stroke="#737373"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
