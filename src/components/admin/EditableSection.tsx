'use client';

import React from 'react';
import { Pencil } from 'lucide-react';
import { useSite } from '@/context/SiteContext';

/**
 * Click-to-edit frame around a preview block.
 *
 * Ported from Jeeva Art School's editor: while the preview workspace is open,
 * each block is wrapped so a click on the block chrome (or its corner chip)
 * hands the section to the editor panel. Anything inside an element marked
 * `data-preview-interactive` keeps its own behaviour, so carousels remain
 * usable without leaving the editor.
 */
export default function EditableSection({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { editor, selectSection } = useSite();

  if (!editor.editMode) return <>{children}</>;

  const selected = editor.selectedId === id;

  return (
    <div
      data-section-id={id}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-preview-interactive]')) return;
        event.preventDefault();
        event.stopPropagation();
        selectSection(id);
      }}
      className={`relative transition-all duration-200 ${
        selected
          ? 'ring-2 ring-studio-gold shadow-[0_0_0_6px_rgba(242,215,112,0.12)]'
          : 'ring-1 ring-transparent hover:ring-studio-gold/40'
      }`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectSection(id);
        }}
        className={`absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-md transition-colors ${
          selected
            ? 'bg-studio-gold text-black'
            : 'border border-studio-gold/40 bg-black/70 text-studio-gold hover:bg-black/90'
        }`}
      >
        <Pencil className="h-3 w-3" />
        {label}
      </button>
      {children}
    </div>
  );
}
