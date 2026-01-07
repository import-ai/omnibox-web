'use client';

import type { TText } from 'platejs/react';
import React from 'react';

import { getFontFamilyCss } from '../plugins/font-family-plugin';

interface FontFamilyLeafProps {
  leaf: TText & { fontFamily?: string };
  children: React.ReactNode;
  attributes?: React.HTMLAttributes<HTMLSpanElement>;
}

export function FontFamilyLeaf({
  leaf,
  children,
  attributes,
}: FontFamilyLeafProps) {
  if (!leaf.fontFamily) {
    return <span {...attributes}>{children}</span>;
  }

  const fontFamily = getFontFamilyCss(leaf.fontFamily);

  return (
    <span
      {...attributes}
      style={{ fontFamily }}
      data-font-family={leaf.fontFamily}
    >
      {children}
    </span>
  );
}
