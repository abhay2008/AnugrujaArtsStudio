'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import initialFallback from '../../content/site.json';
import type { SiteContent, ArtItem, GalleryKey, StudioEvents, ChatbotConfig } from '@/lib/types';
import { optimizeImageForUpload } from '@/lib/imageOptimize';

export const ADMIN_STORAGE_KEY = 'anugruja_admin_content_draft';

interface EditorState {
  workspace: 'studio' | 'preview';
  /** True while the live-preview workspace is open so sections become clickable. */
  editMode: boolean;
  /** Section id currently open in the preview editor panel. */
  selectedId: string | null;
  dirty: boolean;
  saving: boolean;
  status: string;
  commitUrl: string;
  repoUrl: string;
}

interface SiteContextValue {
  content: SiteContent;
  editor: EditorState;
  setWorkspace: (ws: 'studio' | 'preview') => void;
  setEditMode: (on: boolean) => void;
  selectSection: (id: string | null) => void;
  updateBrand: (patch: Partial<SiteContent['brand']>) => void;
  updateMeta: (patch: Partial<SiteContent['meta']>) => void;
  updateSection: <K extends keyof SiteContent['sections']>(sectionKey: K, patch: Partial<SiteContent['sections'][K]>) => void;
  updateEvents: (events: StudioEvents) => void;
  updateChatbot: (patch: Partial<ChatbotConfig>) => void;
  appendArtwork: (gallery: GalleryKey, item: ArtItem) => void;
  updateArtwork: (gallery: GalleryKey, itemId: string, patch: Partial<ArtItem>) => void;
  removeArtwork: (gallery: GalleryKey, itemId: string) => void;
  reorderGallery: (gallery: GalleryKey, fromIndex: number, toIndex: number) => void;
  /** Move an artwork from one collection to another (admin curation). */
  moveArtworkToGallery: (fromGallery: GalleryKey, itemId: string, toGallery: GalleryKey) => void;
  moveArtworkToPosition: (gallery: GalleryKey, itemId: string, targetPos: number) => void;
  uploadFile: (
    file: File,
    options?: { precomputedDataUrl?: string; precomputedFilename?: string; previewUrl?: string }
  ) => Promise<string>;
  save: (override?: SiteContent) => Promise<string>;
  refreshContent: (force?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
  getPendingChanges: () => string[];
}

const defaultContext: SiteContextValue = {
  content: initialFallback as unknown as SiteContent,
  editor: {
    workspace: 'studio',
    editMode: false,
    selectedId: null,
    dirty: false,
    saving: false,
    status: '',
    commitUrl: '',
    repoUrl: '',
  },
  setWorkspace: () => {},
  setEditMode: () => {},
  selectSection: () => {},
  updateBrand: () => {},
  updateMeta: () => {},
  updateSection: () => {},
  updateEvents: () => {},
  updateChatbot: () => {},
  appendArtwork: () => {},
  updateArtwork: () => {},
  removeArtwork: () => {},
  reorderGallery: () => {},
  moveArtworkToGallery: () => {},
  moveArtworkToPosition: () => {},
  uploadFile: async () => '',
  save: async () => '',
  refreshContent: async () => {},
  signOut: async () => {},
  reset: () => {},
  getPendingChanges: () => [],
};

const SiteContext = createContext<SiteContextValue>(defaultContext);

export function useSite() {
  return useContext(SiteContext);
}

/**
 * Field names that differ between two flat config objects, for the admin's
 * review list. Every editable area must be listed: the commit sheet disables
 * its confirm button when nothing is reported, so an unlisted change would be
 * impossible to publish.
 */
function changedFields(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): string[] {
  if (!before || !after) return ['content'];
  return Object.keys({ ...before, ...after }).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );
}

const asRecord = (value: unknown): Record<string, unknown> =>
  (value ?? {}) as Record<string, unknown>;

/** Human wording for a changed field, so the review list reads like English. */
const FIELD_LABELS: Record<string, string> = {
  name: 'name',
  tagline: 'tagline',
  subtitle: 'subtitle',
  founder: 'founder',
  phoneDisplay: 'phone number',
  phoneRaw: 'phone link',
  whatsapp: 'WhatsApp',
  email: 'email',
  locationLabel: 'location',
  mapsUrl: 'map link',
  title: 'browser title',
  description: 'description',
  favicon: 'favicon',
};

const fieldLabel = (key: string): string => FIELD_LABELS[key] ?? key;

/**
 * Plain-English name for each top-level content area, used by the safety-net
 * pass in `getPendingChanges` so an unreported area still reads properly.
 */
const CONTENT_AREA_LABELS: Partial<Record<keyof SiteContent, string>> = {
  meta: 'SEO settings',
  brand: 'studio details',
  social: 'social links',
  galleries: 'gallery artwork',
  sections: 'page sections',
  events: 'event calendar',
  chatbot: 'chatbot settings',
};

export function SiteProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<SiteContent>(initialFallback as unknown as SiteContent);
  const baselineRef = useRef<SiteContent>(initialFallback as unknown as SiteContent);
  const contentRef = useRef<SiteContent>(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const [editor, setEditor] = useState<EditorState>({
    workspace: 'studio',
    editMode: false,
    selectedId: null,
    dirty: false,
    saving: false,
    status: '',
    commitUrl: '',
    repoUrl: '',
  });

  const persist = useCallback((next: SiteContent) => {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const refreshContent = useCallback(async (force = false) => {
    try {
      const res = await fetch(`/api/content?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as SiteContent;
        if (data && data.galleries) {
          baselineRef.current = data;
          if (force || !editor.dirty) {
            setContentState(data);
            // Do NOT persist here: localStorage is reserved for *unsaved* drafts.
            // Writing fetched content into the draft slot made the next page load
            // treat it as unsaved work (phantom "UNSAVED EDITS"), and would also
            // silently overwrite a genuine in-progress draft on refresh.
          }
        }
      }
    } catch (e) {
      console.warn('Could not refresh content:', e);
    }
  }, [editor.dirty, persist]);

  // Boot: decide once between a stored draft and server content.
  // Sequential (not parallel) so the fetch can never clobber a just-loaded
  // draft, and so a stale draft that merely mirrors server content — a legacy
  // artifact of the old persist-on-refresh bug — is discarded as clean.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let draft: SiteContent | null = null;
      try {
        const savedDraft = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft) as SiteContent;
          if (parsed && parsed.galleries) draft = parsed;
        }
      } catch {}

      let server: SiteContent | null = null;
      try {
        const res = await fetch(`/api/content?_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as SiteContent;
          if (data && data.galleries) server = data;
        }
      } catch {}
      if (cancelled) return;

      if (draft) {
        if (server && JSON.stringify(draft) === JSON.stringify(server)) {
          // Draft matches the server exactly: no real unsaved work.
          try {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
          } catch {}
          baselineRef.current = server;
          setContentState(server);
        } else {
          baselineRef.current = server || (initialFallback as unknown as SiteContent);
          setContentState(draft);
          setEditor((prev) => ({ ...prev, dirty: true, status: 'Draft loaded from browser storage' }));
        }
      } else if (server) {
        baselineRef.current = server;
        setContentState(server);
      }
    })();

    fetch('/api/github')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.repoUrl) {
          setEditor((prev) => ({ ...prev, repoUrl: data.repoUrl }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setWorkspace = useCallback((ws: 'studio' | 'preview') => {
    setEditor((prev) => ({ ...prev, workspace: ws }));
  }, []);

  const setEditMode = useCallback((on: boolean) => {
    setEditor((prev) => ({ ...prev, editMode: on }));
  }, []);

  const selectSection = useCallback((id: string | null) => {
    setEditor((prev) => ({ ...prev, selectedId: id }));
  }, []);

  const updateBrand = useCallback((patch: Partial<SiteContent['brand']>) => {
    setContentState((prev) => {
      const next = { ...prev, brand: { ...prev.brand, ...patch } };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Unsaved modifications' }));
  }, [persist]);

  const updateMeta = useCallback((patch: Partial<SiteContent['meta']>) => {
    setContentState((prev) => {
      const next = { ...prev, meta: { ...prev.meta, ...patch } };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Unsaved modifications' }));
  }, [persist]);

  const updateSection = useCallback(<K extends keyof SiteContent['sections']>(
    sectionKey: K,
    patch: Partial<SiteContent['sections'][K]>
  ) => {
    setContentState((prev) => {
      const currentSec = prev.sections?.[sectionKey] || {};
      const next = {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: { ...currentSec, ...patch },
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: `Updated ${String(sectionKey)} section` }));
  }, [persist]);

  const updateEvents = useCallback((events: StudioEvents) => {
    setContentState((prev) => {
      const next = { ...prev, events };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Updated events calendar' }));
  }, [persist]);

  const updateChatbot = useCallback((patch: Partial<ChatbotConfig>) => {
    setContentState((prev) => {
      const currentChatbot: ChatbotConfig = prev.chatbot ?? {
        enabled: true,
        welcomeMessage: '',
        suggestedPrompts: [],
        faqs: [],
      };
      const next: SiteContent = { ...prev, chatbot: { ...currentChatbot, ...patch } };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Updated chatbot settings' }));
  }, [persist]);

  const appendArtwork = useCallback((gallery: GalleryKey, item: ArtItem) => {
    setContentState((prev) => {
      const list = prev.galleries[gallery] || [];
      const next = {
        ...prev,
        galleries: {
          ...prev.galleries,
          [gallery]: [item, ...list],
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Added artwork to ' + gallery }));
  }, [persist]);

  /** Move an artwork between collections (e.g. Featured → Art for Sale). */
  const moveArtworkToGallery = useCallback((fromGallery: GalleryKey, itemId: string, toGallery: GalleryKey) => {
    if (fromGallery === toGallery) return;
    setContentState((prev) => {
      const fromList = prev.galleries[fromGallery] || [];
      const item = fromList.find((i) => i.id === itemId);
      if (!item) return prev;
      const toList = prev.galleries[toGallery] || [];
      const next = {
        ...prev,
        galleries: {
          ...prev.galleries,
          [fromGallery]: fromList.filter((i) => i.id !== itemId),
          [toGallery]: [item, ...toList],
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: `Moved artwork to ${toGallery}` }));
  }, [persist]);

  const updateArtwork = useCallback((gallery: GalleryKey, itemId: string, patch: Partial<ArtItem>) => {
    setContentState((prev) => {
      const list = prev.galleries[gallery] || [];
      const nextList = list.map((i) => {
        if (i.id !== itemId) return i;
        const next = { ...i, ...patch };
        // Price-confirmation rule: writing a non-empty price from any admin
        // form stamps the painting as price-confirmed, so it renders publicly.
        // A patch that already carries priceConfirmedAt (e.g. the upload
        // wizard, which stamps at publish time) wins unchanged.
        if (!('priceConfirmedAt' in patch)) {
          const priceChanged = (i.price ?? '') !== (next.price ?? '');
          const hasPrice = next.price !== undefined && next.price !== null && String(next.price).trim() !== '';
          if (priceChanged && hasPrice) next.priceConfirmedAt = new Date().toISOString();
        }
        return next;
      });
      const next = {
        ...prev,
        galleries: {
          ...prev.galleries,
          [gallery]: nextList,
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Updated artwork' }));
  }, [persist]);

  const removeArtwork = useCallback((gallery: GalleryKey, itemId: string) => {
    setContentState((prev) => {
      const list = prev.galleries[gallery] || [];
      const nextList = list.filter((i) => i.id !== itemId);
      const next = {
        ...prev,
        galleries: {
          ...prev.galleries,
          [gallery]: nextList,
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Removed artwork' }));
  }, [persist]);

  const reorderGallery = useCallback((gallery: GalleryKey, fromIndex: number, toIndex: number) => {
    setContentState((prev) => {
      const list = [...(prev.galleries[gallery] || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return prev;
      }
      const [item] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, item);
      const next = {
        ...prev,
        galleries: {
          ...prev.galleries,
          [gallery]: list,
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Reordered artworks' }));
  }, [persist]);

  const moveArtworkToPosition = useCallback((gallery: GalleryKey, itemId: string, targetPos: number) => {
    setContentState((prev) => {
      const list = [...(prev.galleries[gallery] || [])];
      const fromIndex = list.findIndex((i) => i.id === itemId);
      if (fromIndex === -1) return prev;
      const toIndex = Math.max(0, Math.min(list.length - 1, targetPos - 1));
      if (fromIndex === toIndex) return prev;
      const [item] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, item);
      const next = {
        ...prev,
        galleries: {
          ...prev.galleries,
          [gallery]: list,
        },
      };
      persist(next);
      return next;
    });
    setEditor((prev) => ({ ...prev, dirty: true, status: 'Moved artwork' }));
  }, [persist]);

  const uploadFile = useCallback(
    async (
      file: File,
      options?: { precomputedDataUrl?: string; precomputedFilename?: string; previewUrl?: string }
    ): Promise<string> => {
      let dataUrl = options?.precomputedDataUrl;
      let filename = options?.precomputedFilename;

      if (!dataUrl || !filename) {
        const optimized = await optimizeImageForUpload(file, options?.previewUrl);
        dataUrl = optimized.dataUrl;
        filename = optimized.filename;
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data: dataUrl }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || 'Artwork upload failed');
      }

      const json = (await res.json()) as { url: string };
      return json.url;
    },
    []
  );

  const save = useCallback(async (override?: SiteContent): Promise<string> => {
    setEditor((prev) => ({ ...prev, saving: true, status: 'Publishing & saving changes…' }));
    try {
      const target = override || contentRef.current;
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Failed to save content');
      }

      const json = (await res.json()) as {
        github?: { commitUrl?: string; htmlUrl?: string };
      };

      // The committed payload is the source of truth. Pushing it into state
      // matters when an explicit override was saved (e.g. an upload publish):
      // without it the editor would show stale galleries and report phantom
      // "deleted artwork" changes against the new baseline.
      setContentState(target);
      baselineRef.current = target;
      persist(target);

      const commitUrl = json.github?.commitUrl || json.github?.htmlUrl || '';
      setEditor((prev) => ({
        ...prev,
        saving: false,
        dirty: false,
        status: commitUrl ? 'Committed & pushed to GitHub!' : 'Saved to site.json',
        commitUrl,
      }));

      try {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      } catch {}

      return commitUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save error';
      setEditor((prev) => ({ ...prev, saving: false, status: `Save failed: ${msg}` }));
      throw e;
    }
  }, [persist]);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {}
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {}
    window.location.href = '/login';
  }, []);

  const reset = useCallback(() => {
    setContentState(initialFallback as unknown as SiteContent);
    baselineRef.current = initialFallback as unknown as SiteContent;
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {}
    setEditor((prev) => ({ ...prev, dirty: false, status: 'Reset to default content' }));
  }, []);

  const getPendingChanges = useCallback((): string[] => {
    const base = baselineRef.current;
    const curr = content;
    const changes: string[] = [];
    /** Top-level areas already accounted for, so the safety net can skip them. */
    const reported = new Set<keyof SiteContent>();
    const report = (key: keyof SiteContent, text: string) => {
      changes.push(text);
      reported.add(key);
    };

    // Studio details & SEO are diffed field by field from the objects
    // themselves, so a field added later is reported the day it is edited
    // instead of silently going missing from this list.
    const brandFields = changedFields(asRecord(base.brand), asRecord(curr.brand));
    if (brandFields.length > 0) {
      report('brand', `Studio details: ${brandFields.map(fieldLabel).join(', ')}`);
    }
    const metaFields = changedFields(asRecord(base.meta), asRecord(curr.meta));
    if (metaFields.length > 0) {
      report('meta', `SEO settings: ${metaFields.map(fieldLabel).join(', ')}`);
    }

    // Every section the console can edit, reported field by field.
    (Object.keys(curr.sections ?? {}) as (keyof SiteContent['sections'])[]).forEach((key) => {
      const fields = changedFields(
        asRecord(base.sections?.[key]),
        asRecord(curr.sections?.[key])
      );
      if (fields.length > 0) {
        report('sections', `Updated "${String(key)}" section (${fields.join(', ')})`);
      }
    });

    if (JSON.stringify(base.social) !== JSON.stringify(curr.social)) {
      report('social', 'Social links updated');
    }
    if (JSON.stringify(base.chatbot) !== JSON.stringify(curr.chatbot)) {
      report('chatbot', 'Chatbot settings updated');
    }

    const galleriesFrom = changes.length;

    (Object.keys(curr.galleries) as GalleryKey[]).forEach((gKey) => {
      const bList = base.galleries[gKey] || [];
      const cList = curr.galleries[gKey] || [];
      const bIds = new Set(bList.map((i) => i.id));
      const cIds = new Set(cList.map((i) => i.id));

      cList.forEach((item) => {
        if (!bIds.has(item.id)) {
          changes.push(`Added artwork "${item.title}" to gallery [${gKey}]`);
        }
      });

      bList.forEach((item) => {
        if (!cIds.has(item.id)) {
          changes.push(`Deleted artwork "${item.title}" from gallery [${gKey}]`);
        }
      });

      // Track edited items
      cList.forEach((cItem) => {
        const bItem = bList.find((b) => b.id === cItem.id);
        if (bItem) {
          const fieldChanges: string[] = [];
          if (bItem.title !== cItem.title) fieldChanges.push(`title: "${cItem.title}"`);
          if ((bItem.price ?? '') !== (cItem.price ?? '')) fieldChanges.push(`price: "${cItem.price || 'none'}"`);
          if ((bItem.category ?? '') !== (cItem.category ?? '')) fieldChanges.push(`category: "${cItem.category || 'default'}"`);
          if ((bItem.medium ?? '') !== (cItem.medium ?? '')) fieldChanges.push(`medium: "${cItem.medium || 'none'}"`);
          if ((bItem.status ?? '') !== (cItem.status ?? '')) fieldChanges.push(`status: "${cItem.status || 'none'}"`);
          if (fieldChanges.length > 0) {
            changes.push(`Edited "${bItem.title}" in [${gKey}] (${fieldChanges.join(', ')})`);
          }
        }
      });

      if (bList.length === cList.length && bList.length > 1) {
        const isReordered = cList.some((it, idx) => it.id !== bList[idx]?.id);
        if (isReordered) changes.push(`Reordered gallery: ${gKey}`);
      }
    });

    if (changes.length > galleriesFrom) reported.add('galleries');
    const eventsFrom = changes.length;

    // Studio events — the calendar the Events tab edits.
    (['upcoming', 'past'] as const).forEach((listKey) => {
      const before = base.events?.[listKey] ?? [];
      const after = curr.events?.[listKey] ?? [];
      const beforeById = new Map(before.map((event) => [event.id, event]));
      const afterById = new Map(after.map((event) => [event.id, event]));

      after.forEach((event) => {
        if (!beforeById.has(event.id)) changes.push(`Added ${listKey} event "${event.title}"`);
      });
      before.forEach((event) => {
        if (!afterById.has(event.id)) changes.push(`Removed ${listKey} event "${event.title}"`);
      });
      after.forEach((event) => {
        const previous = beforeById.get(event.id);
        if (!previous) return;
        const fields = changedFields(asRecord(previous), asRecord(event));
        if (fields.length > 0) {
          changes.push(`Edited ${listKey} event "${event.title}" (${fields.join(', ')})`);
        }
      });
    });

    if (changes.length > eventsFrom) reported.add('events');

    // Safety net. Nothing in the console may edit without being committable:
    // the review sheet disables its confirm button on an empty list, so any
    // area that differs but produced no message above still has to be counted.
    (Object.keys(curr) as (keyof SiteContent)[]).forEach((key) => {
      if (reported.has(key)) return;
      if (JSON.stringify(base[key]) !== JSON.stringify(curr[key])) {
        changes.push(`Updated ${CONTENT_AREA_LABELS[key] ?? String(key)}`);
      }
    });

    return changes;
  }, [content]);

  return (
    <SiteContext.Provider
      value={{
        content,
        editor,
        setWorkspace,
        setEditMode,
        selectSection,
        updateBrand,
        updateMeta,
        updateSection,
        updateEvents,
        updateChatbot,
        appendArtwork,
        updateArtwork,
        removeArtwork,
        reorderGallery,
        moveArtworkToPosition,
        moveArtworkToGallery,
        uploadFile,
        save,
        refreshContent,
        signOut,
        reset,
        getPendingChanges,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}
