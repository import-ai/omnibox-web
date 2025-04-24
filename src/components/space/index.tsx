import React from 'react';
import { cn } from '@/lib/utils';

interface IProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function Space(props: IProps) {
  const { style, className, children } = props;

  return (
    <div style={style} className={cn('flex gap-2', className)}>
      {children}
    </div>
  );
}
