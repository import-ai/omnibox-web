'use client';

import type { TElement } from 'platejs/react';
import React from 'react';

interface HrElementProps {
  element: TElement;
  attributes?: React.HTMLAttributes<HTMLHRElement>;
  children?: React.ReactNode;
}

export function HrElement({ attributes }: HrElementProps) {
  return (
    <div contentEditable={false} {...attributes}>
      <hr className="my-4 border-border" />
    </div>
  );
}
