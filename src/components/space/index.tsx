import React from 'react';

import { cn } from '@/lib/utils';

interface IProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function Space(props: IProps) {
  const { style, className, onClick, children } = props;

  return (
    <div
      style={style}
      onClick={onClick}
      className={cn('flex gap-2', className)}
    >
      {children}
    </div>
  );
}
