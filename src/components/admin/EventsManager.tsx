'use client';

import { useState } from 'react';
import {
  CalendarPlus,
  Check,
  History,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import type { StudioEvent } from '@/lib/types';
import type { CommitFlow } from './AdminShell';
import { useConfirm } from './ConfirmDialog';

function makeId(): string {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function eventImagesCount(event: StudioEvent): number {
  return event.images?.filter(Boolean).length || (event.image ? 1 : 0);
}

const inputCls =
  'w-full px-3 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/40 text-xs text-yellow-100 focus:outline-none focus:border-yellow-300';

const labelCls = 'text-[10px] uppercase font-bold text-yellow-200/60';

function EventEditor({
  draft,
  onChange,
  onCancel,
  onSave,
  onUploadPhotos,
  uploading,
  heading,
}: {
  draft: StudioEvent;
  onChange: (e: StudioEvent) => void;
  onCancel: () => void;
  onSave: () => void;
  onUploadPhotos: (files: FileList | null) => Promise<void>;
  uploading: boolean;
  heading: string;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-[#ffe76c] font-blippo">{heading}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-purple-900/60 text-yellow-200" aria-label="Cancel editing">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Title *</label>
          <input className={`${inputCls} mt-1`} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Date (as displayed) *</label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="Oct 12, 2026"
            value={draft.date}
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>ISO date (for sorting)</label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="2026-10-12"
            value={draft.dateIso ?? ''}
            onChange={(e) => onChange({ ...draft, dateIso: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input
            className={`${inputCls} mt-1`}
            value={draft.location ?? ''}
            onChange={(e) => onChange({ ...draft, location: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Registration link (optional)</label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="https://posts.gle/…"
            value={draft.registrationUrl ?? ''}
            onChange={(e) => onChange({ ...draft, registrationUrl: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Registration deadline</label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="Registrations close October 5"
            value={draft.registrationDeadline ?? ''}
            onChange={(e) => onChange({ ...draft, registrationDeadline: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Event type</label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="Workshop / Exhibition / Retreat"
            value={draft.eventType ?? ''}
            onChange={(e) => onChange({ ...draft, eventType: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Seats remaining</label>
          <input
            type="number"
            min="0"
            className={`${inputCls} mt-1`}
            placeholder="Optional"
            value={draft.seatsRemaining ?? ''}
            onChange={(e) => onChange({ ...draft, seatsRemaining: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <label className={labelCls}>Event photos</label>
          <textarea
            className={`${inputCls} min-h-[64px]`}
            placeholder="One image path or URL per line"
            value={(draft.images ?? (draft.image ? [draft.image] : [])).join('\n')}
            onChange={(e) => onChange({ ...draft, images: e.target.value.split(/\n|,/).map((value) => value.trim()).filter(Boolean) })}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-studio-gold/30 bg-purple-950/70 px-3 py-2 text-[11px] font-bold text-yellow-100/80 hover:border-studio-gold/60 hover:text-white">
            <Upload className="h-3.5 w-3.5 text-studio-gold" />
            {uploading ? 'Uploading photos…' : 'Upload photos from computer'}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              className="sr-only"
              onChange={(e) => void onUploadPhotos(e.target.files)}
            />
          </label>
          <p className="text-[10px] text-yellow-200/45">Uploaded images are added to the gallery above. Click any photo on the public site to enlarge it.</p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} mt-1 min-h-[64px]`}
            value={draft.description ?? ''}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Outcome (past events only — how it went)</label>
          <input
            className={`${inputCls} mt-1`}
            value={draft.outcome ?? ''}
            onChange={(e) => onChange({ ...draft, outcome: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs bg-purple-950 text-yellow-200 hover:bg-purple-900 border border-purple-800">
          Cancel
        </button>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md text-xs bg-amber-500 text-black font-bold hover:bg-amber-400 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Admin editor for `events` in content/site.json — the structured calendar
 * powering the home spotlight, and the chatbot's events knowledge.
 *
 * Each card carries a pencil (edit) and a tick (save & publish) so the two
 * actions are never confused for one another; tapping the card itself asks
 * which of the two was meant.
 */
export default function EventsManager({ flow }: { flow: CommitFlow }) {
  const { content, updateEvents, uploadFile } = useSite();
  // Deletions confirm through the console's own dialog, not window.confirm.
  const { confirm, dialog: confirmDialog } = useConfirm();

  const upcoming: StudioEvent[] = content.events?.upcoming ?? [];
  const past: StudioEvent[] = content.events?.past ?? [];

  const [editing, setEditing] = useState<{ list: 'upcoming' | 'past'; id: string } | null>(null);
  const [draft, setDraft] = useState<StudioEvent | null>(null);
  const [uploading, setUploading] = useState(false);
  /** Card whose "edit or save?" question is currently open. */
  const [askingId, setAskingId] = useState<string | null>(null);

  const canSave = flow.dirty && !flow.saving;

  const openSave = () => {
    setAskingId(null);
    flow.setReviewOpen(true);
  };

  const persist = (nextUpcoming: StudioEvent[], nextPast: StudioEvent[]) => {
    updateEvents({ upcoming: nextUpcoming, past: nextPast });
  };

  const startEdit = (list: 'upcoming' | 'past', item: StudioEvent) => {
    setAskingId(null);
    setEditing({ list, id: item.id });
    setDraft({ ...item });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadFile(file));
      }
      setDraft((current) => current ? { ...current, images: [...(current.images ?? []), ...urls] } : current);
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = () => {
    if (!draft || !editing) return;
    if (!draft.title.trim() || !draft.date.trim()) return;
    if (editing.list === 'upcoming') {
      persist(upcoming.map((e) => (e.id === draft.id ? draft : e)), past);
    } else {
      persist(upcoming, past.map((e) => (e.id === draft.id ? draft : e)));
    }
    cancelEdit();
  };

  const addItem = (list: 'upcoming' | 'past') => {
    const fresh: StudioEvent = {
      id: makeId(),
      title: list === 'upcoming' ? 'New Workshop' : 'Past Event',
      date: list === 'upcoming' ? 'Coming soon' : '2026',
    };
    persist(list === 'upcoming' ? [...upcoming, fresh] : upcoming, list === 'past' ? [...past, fresh] : past);
    startEdit(list, fresh);
  };

  const removeItem = (list: 'upcoming' | 'past', id: string) => {
    persist(
      list === 'upcoming' ? upcoming.filter((e) => e.id !== id) : upcoming,
      list === 'past' ? past.filter((e) => e.id !== id) : past
    );
    if (editing?.id === id) cancelEdit();
  };

  const renderList = (list: 'upcoming' | 'past') => {
    const items = list === 'upcoming' ? upcoming : past;
    const isUpcoming = list === 'upcoming';

    return (
      <div className="rounded-3xl border border-studio-gold/25 bg-[#190626]/90 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isUpcoming ? (
              <CalendarPlus className="w-5 h-5 text-amber-300" />
            ) : (
              <History className="w-5 h-5 text-yellow-200/70" />
            )}
            <h3 className="font-blippo text-lg text-[#ffe76c]">{isUpcoming ? 'Upcoming Events & Workshops' : 'Past Events & Exhibitions'}</h3>
            <span className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-yellow-300">{items.length}</span>
          </div>
          <button
            onClick={() => addItem(list)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-2 text-xs font-bold text-black shadow-md hover:from-amber-400 hover:to-yellow-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {isUpcoming ? 'Upcoming' : 'Past'}
          </button>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-yellow-200/50">
            Nothing here yet{isUpcoming ? ' — add the next workshop so visitors and Chitra know about it!' : '.'}
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {items.map((item) =>
              editing && editing.id === item.id && draft ? (
                <div key={item.id} className="rounded-2xl border border-studio-gold/40 bg-[#1d062e]">
                  <EventEditor
                    draft={draft}
                    heading={isUpcoming ? 'Editing upcoming event' : 'Editing past event'}
                    onChange={setDraft}
                    onCancel={cancelEdit}
                    onSave={saveEdit}
                    onUploadPhotos={uploadPhotos}
                    uploading={uploading}
                  />
                </div>
              ) : (
                <div
                  key={item.id}
                  className="rounded-2xl border border-purple-900/50 bg-[#160523]/80 p-3 transition-colors hover:border-studio-gold/40"
                >
                  <div className="flex items-start gap-3">
                    {/*
                      The card body is the trigger for "edit or save?". It is a
                      real button, but it holds only text so the action icons
                      stay separate, focusable controls instead of nesting
                      buttons inside a button.
                    */}
                    <button
                      type="button"
                      onClick={() => setAskingId((prev) => (prev === item.id ? null : item.id))}
                      aria-expanded={askingId === item.id}
                      title="Ask what to do with this event"
                      className="min-w-0 flex-1 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-gold/60"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#fdf5cf]">{item.title}</span>
                        <span className="rounded-full border border-amber-700/50 bg-amber-950/50 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          {item.date}
                        </span>
                        {item.location && (
                          <span className="text-[11px] text-yellow-100/50">📍 {item.location}</span>
                        )}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-yellow-100/50">
                        {item.eventType && <span>{item.eventType}</span>}
                        {item.registrationDeadline && <span>Register by: {item.registrationDeadline}</span>}
                        {item.seatsRemaining !== undefined && <span>{item.seatsRemaining} seats left</span>}
                        {eventImagesCount(item) > 0 && <span>{eventImagesCount(item)} photos</span>}
                      </span>
                      {item.description && (
                        <span className="mt-1 line-clamp-2 text-xs text-yellow-100/55">{item.description}</span>
                      )}
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Edit this event"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => startEdit(list, item)}
                        className="rounded-lg border border-purple-900/60 bg-purple-950/80 p-1.5 text-yellow-200 transition-colors hover:bg-purple-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title={
                          canSave
                            ? 'Save & publish the pending changes to the live site'
                            : 'Nothing to save yet'
                        }
                        aria-label="Save and publish pending changes"
                        disabled={!canSave}
                        onClick={openSave}
                        className={`rounded-lg border p-1.5 transition-colors ${
                          canSave
                            ? 'border-studio-gold/60 bg-gradient-to-br from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400'
                            : 'cursor-not-allowed border-purple-900/60 bg-purple-950/50 text-yellow-200/35'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete event"
                        aria-label={`Delete ${item.title}`}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete event',
                            message: `Delete “${item.title}” from the studio calendar? It is staged as an unsaved change and can still be discarded before commit.`,
                          });
                          if (ok) removeItem(list, item.id);
                        }}
                        className="rounded-lg border border-red-900/50 bg-red-950/60 p-1.5 text-red-300 transition-colors hover:bg-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* The question the card asks when tapped. */}
                  {askingId === item.id && (
                    <div className="mt-2.5 rounded-xl border border-studio-gold/40 bg-[#1d062e] px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-yellow-100/80">
                          What would you like to do with “{item.title}”?
                        </span>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(list, item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-800 bg-purple-950/70 px-3 py-1.5 text-xs font-bold text-yellow-100 hover:bg-purple-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!canSave}
                            onClick={openSave}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-xs font-bold text-black shadow-sm hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setAskingId(null)}
                            aria-label="Close this question"
                            className="rounded-lg border border-purple-800 bg-purple-950/70 p-1.5 text-yellow-200/70 hover:bg-purple-900"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {!flow.dirty && (
                        <p className="mt-1.5 text-[10px] text-yellow-200/50">
                          Nothing to save yet — edit an event first, then Save changes publishes
                          everything staged here, including paintings and listings.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-studio-sunset" />
          <h2 className="font-blippo text-2xl text-[#ffe76c]">Events & Chatbot</h2>
        </div>
        <p className="max-w-3xl text-sm text-yellow-100/70">
          Keep the studio calendar fresh — upcoming workshops and past exhibitions. Everything you
          save here also teaches <strong className="text-studio-gold">Chitra</strong>, the website's AI
          assistant, so visitors asking the chatbot instantly hear about new events, paintings and prices.
        </p>
      </div>

      {renderList('upcoming')}
      {renderList('past')}

      <p className="text-[11px] text-yellow-200/40 leading-relaxed">
        Changes appear in the review list before publishing. Use "Review &amp; Commit" to push them
        to the live site — the chatbot updates automatically on the next commit.
      </p>

      {confirmDialog}
    </div>
  );
}
