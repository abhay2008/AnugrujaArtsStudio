'use client';

import React, { CSSProperties, ReactNode, ElementType } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Animation variant: up (default), left, right, zoom */
  variant?: 'up' | 'left' | 'right' | 'zoom';
  /** Stagger delay in ms */
  delay?: number;
  as?: ElementType;
}

const variantClass: Record<string, string> = {
  up: '',
  left: 'reveal-l',
  right: 'reveal-r',
  zoom: 'reveal-zoom',
};

/** Declarative scroll-reveal wrapper (uses the ScrollReveal engine). */
export default function Reveal({
  children,
  className = '',
  variant = 'up',
  delay = 0,
  as: Tag = 'div',
}: RevealProps) {
  const style = delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined;
  return (
    <Tag className={`reveal ${variantClass[variant]} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
