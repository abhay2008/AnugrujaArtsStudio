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
            persist(data);
          }
        }
      }
    } catch (e) {
      console.warn('Could not refresh content:', e);
    }
  }, [editor.dirty, persist]);

  // Load from local storage draft or server on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as SiteContent;
        if (parsed && parsed.galleries) {
          setContentState(parsed);
          setEditor((prev) => ({ ...prev, dirty: true, status: 'Draft loaded from browser storage' }));
        }
      }
    } catch {}

    void refreshContent();

    fetch('/api/github')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.repoUrl) {
          setEditor((prev) => ({ ...prev, repoUrl: data.repoUrl }));
        }
      })
      .catch(() => {});
  }, [refreshContent]);

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

  const updateArtwork = useCallback((gallery: GalleryKey, itemId: string, patch: Partial<ArtItem>) => {
    setContentState((prev) => {
      const list = prev.galleries[gallery] || [];
      const nextList = list.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
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

    if (base.brand.name !== curr.brand.name) changes.push(`Brand Name: "${curr.brand.name}"`);
    if (base.brand.founder !== curr.brand.founder) changes.push(`Founder: "${curr.brand.founder}"`);
    if (base.brand.tagline !== curr.brand.tagline) changes.push(`Tagline: "${curr.brand.tagline}"`);
    if (base.brand.phoneDisplay !== curr.brand.phoneDisplay) changes.push(`Phone: "${curr.brand.phoneDisplay}"`);
    if (base.brand.whatsapp !== curr.brand.whatsapp) changes.push(`WhatsApp Contact updated`);
    if (base.brand.email !== curr.brand.email) changes.push(`Email: "${curr.brand.email}"`);
    if (base.meta.title !== curr.meta.title) changes.push(`SEO Title: "${curr.meta.title}"`);
    if (base.meta.description !== curr.meta.description) changes.push(`SEO Meta Description updated`);

    if (base.sections?.banner?.quote !== curr.sections?.banner?.quote) {
      changes.push(`Hero Banner Quote updated: "${curr.sections?.banner?.quote}"`);
    }
    if (base.sections?.banner?.badge !== curr.sections?.banner?.badge) {
      changes.push(`Hero Banner Badge updated: "${curr.sections?.banner?.badge}"`);
    }
    if (base.sections?.aboutArtist?.headline !== curr.sections?.aboutArtist?.headline) {
      changes.push(`About Artist Headline updated`);
    }

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
          if (bItem.price !== cItem.price) fieldChanges.push(`price: "${cItem.price || 'none'}"`);
          if (bItem.category !== cItem.category) fieldChanges.push(`category: "${cItem.category || 'default'}"`);
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
