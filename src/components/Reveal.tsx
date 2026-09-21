import React, { CSSProperties, ReactNode, ElementType } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Animation variant: up (default), left, right, zoom, fade */
  variant?: 'up' | 'left' | 'right' | 'zoom' | 'fade';
  /** Stagger delay in ms */
  delay?: number;
  as?: ElementType;
}

const variantClass: Record<string, string> = {
  up: '',
  left: 'reveal-l',
  right: 'reveal-r',
  zoom: 'reveal-zoom',
  fade: 'reveal-fade',
};

/**
 * Declarative scroll-reveal wrapper (uses the ScrollReveal engine).
 *
 * Deliberately NOT a client component: it renders an element and a class, and
 * every bit of behaviour lives in the single global `ScrollReveal` observer.
 * Marking it 'use client' bought nothing and cost a separate hydration
 * boundary for each of the ten sections on the home page.
 */
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
