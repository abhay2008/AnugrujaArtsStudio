'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  ListTree,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { PageListing } from '@/lib/types';
import { useConfirm } from './ConfirmDialog';

const ICON_CHOICES = [
  { value: 'tag', label: 'Tag (Buy / Price)' },
  { value: 'palette', label: 'Palette (Gallery)' },
  { value: 'award', label: 'Award (Workshops)' },
  { value: 'graduation', label: 'Graduation Cap (Classes)' },
  { value: 'user', label: 'User (About)' },
  { value: 'sparkles', label: 'Sparkles (Generic)' },
];

const HREF_HINT =
  'Home shortcuts use #section-id (e.g. #buy-paintings, #one, #two). Other pages use paths like /classes or /about.';

function makeId(): string {
  return `qn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Admin editor for the home-page sticky quick-nav shortcuts
 * (sections.pageMeta.quickNav in content/site.json).
 */
export default function QuickNavManager() {
  // Destructive actions ask through the console's own dialog, never
  // window.confirm — see ConfirmDialog for why.
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { content, updateSection } = useSite();
  const items: PageListing[] = content.sections?.pageMeta?.quickNav ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PageListing | null>(null);

  const persist = (next: PageListing[]) => {
    updateSection('pageMeta', { quickNav: next });
  };

  const startEdit = (item: PageListing) => {
    setEditingId(item.id);
    setDraft({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    persist(items.map((i) => (i.id === draft.id ? draft : i)));
    cancelEdit();
  };

  const addItem = () => {
    const fresh: PageListing = {
      id: makeId(),
      icon: 'sparkles',
      label: 'New Shortcut',
      href: '#one',
      title: 'New Shortcut',
      subtitle: '',
    };
    persist([...items, fresh]);
    startEdit(fresh);
  };

  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
    if (editingId === id) cancelEdit();
  };

  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(idx, 1);
    next.splice(to, 0, it);
    persist(next);
  };

  const inputCls =
    'w-full px-3 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/40 text-xs text-yellow-100 focus:outline-none focus:border-yellow-300';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListTree className="w-6 h-6 text-studio-sunset" />
            <h2 className="font-blippo text-2xl text-[#ffe76c]">Home Shortcuts Bar</h2>
          </div>
          <p className="text-sm text-yellow-100/70 mt-1 max-w-2xl">
            These chips float at the bottom of the home page while visitors scroll. Edit the
            label, icon, link target and blurb of each shortcut — or add new ones.
          </p>
        </div>
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm shadow-md hover:from-amber-400 hover:to-yellow-400 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Shortcut</span>
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-14 p-8 rounded-3xl bg-[#1b052a]/60 border border-purple-900/40">
          <p className="text-yellow-200/60 font-medium">No shortcuts configured.</p>
          <p className="text-xs text-yellow-200/40 mt-1">
            Add one so visitors can jump straight to “Buy Paintings” while scrolling.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#190626] border border-studio-gold/25 hover:border-studio-gold/50 transition-all"
            >
              {editingId === item.id && draft ? (
                /* -------- edit mode -------- */
                <div className="p-4 sm:p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#ffe76c] font-blippo">
                      Editing shortcut
                    </h3>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg hover:bg-purple-900/60 text-yellow-200"
                      aria-label="Cancel editing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">
                        Chip label (shown in bar)
                      </label>
                      <input
                        className={`${inputCls} mt-1`}
                        value={draft.label}
                        maxLength={24}
                        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">
                        Icon
                      </label>
                      <select
                        className={`${inputCls} mt-1`}
                        value={draft.icon}
                        onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                      >
                        {ICON_CHOICES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">
                        Link target
                      </label>
                      <input
                        className={`${inputCls} mt-1`}
                        value={draft.href}
                        placeholder="#buy-paintings or /classes"
                        onChange={(e) => setDraft({ ...draft, href: e.target.value })}
                      />
                      <p className="text-[10px] text-yellow-200/40 mt-1">{HREF_HINT}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">
                        Section title
                      </label>
                      <input
                        className={`${inputCls} mt-1`}
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">
                        Blurb / subtitle
                      </label>
                      <input
                        className={`${inputCls} mt-1`}
                        value={draft.subtitle}
                        placeholder="Shown as the tagline under the section title"
                        onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-md text-xs bg-purple-950 text-yellow-200 hover:bg-purple-900 border border-purple-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md text-xs bg-amber-500 text-black font-bold hover:bg-amber-400 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* -------- read mode -------- */
                <div className="flex items-center gap-3 p-3.5">
                  <GripVertical className="w-4 h-4 text-yellow-200/25 shrink-0" />
                  <span className="w-8 text-center text-xs font-mono font-bold text-studio-gold bg-black/40 py-1 px-1 rounded-md border border-purple-900 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#fdf5cf]">{item.label}</span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-amber-300 border border-purple-900">
                        {item.href}
                      </code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/70 text-yellow-200/80 border border-purple-900/60">
                        {item.icon}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-yellow-100/50 mt-0.5 truncate">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title="Move up"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                      className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      title="Move down"
                      disabled={idx === items.length - 1}
                      onClick={() => move(idx, 1)}
                      className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      title="Edit shortcut"
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-800 text-yellow-200 border border-purple-900/60"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete shortcut"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete shortcut',
                          message: `Delete the “${item.label}” shortcut? It is staged as an unsaved change and can still be discarded before commit.`,
                        });
                        if (ok) removeItem(item.id);
                      }}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-900/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-yellow-200/40 leading-relaxed">
        Changes appear in the review list before publishing. Use “Review &amp; Publish” to commit
        them to the live site.
      </p>

      {confirmDialog}
    </div>
  );
}
