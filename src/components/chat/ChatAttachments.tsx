'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  ExternalLink,
  Images,
  Maximize2,
  MessageCircle,
  RotateCcw,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { imageUrl } from '@/lib/imageSrc';
import { isPriceConfirmed, publicPriceLabel } from '@/lib/price';
import { GALLERY_LOCATIONS, type ChatPageLink, type ChatPainting } from './chatRefs';
import './chatAttachments.css';

/* ── Helpers ───────────────────────────────────────────────────────────── */

function priceLabel(art: ChatPainting): string {
  // Only the sale collection is commercial; showcase galleries never show a price.
  if (art.gallery !== 'sale') return '';
  return publicPriceLabel(art.price, isPriceConfirmed(art), true);
}

function statusOf(art: ChatPainting): string | null {
  if (art.gallery !== 'sale') return null;
  return art.status ?? 'Available';
}

function getWhatsAppEnquiryUrl(art: ChatPainting, waBase: string): string {
  const price = priceLabel(art);
  let text = `Hi! I saw "${art.title}" on the Anugruja Arts Studio website.`;
  if (art.gallery === 'sale') {
    text = price
      ? `Hi! I'm interested in purchasing the original painting "${art.title}" (${price}) from your sale collection. Is it available?`
      : `Hi! I'm interested in purchasing the original painting "${art.title}" from your sale collection. Could you share price and availability?`;
  } else if (art.gallery === 'commission') {
    text = `Hi! I'd love to commission a custom artwork inspired by "${art.title}". Could you share details on sizing and timelines?`;
  } else if (art.gallery === 'classes' || art.gallery === 'watercolor') {
    text = `Hi! I'm interested in the art courses related to "${art.title}". Could you share batch details and syllabus?`;
  } else if (art.gallery === 'workshop') {
    text = `Hi! I'd love to learn more about upcoming workshops related to "${art.title}".`;
  }
  return `${waBase}?text=${encodeURIComponent(text)}`;
}

/** Optimised WebP derivative with a graceful fall back to the original. */
function ChatImg({ src, alt, width, className }: { src: string; alt: string; width: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? src : imageUrl(src, width)}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => !failed && setFailed(true)}
      className={className}
    />
  );
}

/** Fallback clipboard copier using a detached input if navigator.clipboard is unavailable. */
function copyToClipboardFallback(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Index of the slide whose left edge is closest to the track's scroll position. */
function nearestIndex(track: HTMLElement): number {
  const slides = Array.from(track.children) as HTMLElement[];
  const left = track.scrollLeft;
  let best = 0;
  let bestDist = Infinity;
  slides.forEach((s, i) => {
    const d = Math.abs(s.offsetLeft - track.offsetLeft - left);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  // Scrolled to the very end: the last slide is "current" even if it can't snap left.
  if (left + track.clientWidth >= track.scrollWidth - 2) return slides.length - 1;
  return best;
}

/* ── Page / section buttons ───────────────────────────────────────────── */

export function ChatPageLinks({ links, onNavigate }: { links: ChatPageLink[]; onNavigate: (href: string) => void }) {
  if (links.length === 0) return null;
  return (
    <div className="chat-links" role="group" aria-label="Related pages and sections">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="chat-link-btn"
          aria-label={l.hint ? `${l.label} — ${l.hint}` : l.label}
          onClick={(e) => {
            // Let modified clicks (new tab / window) behave natively.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onNavigate(l.href);
          }}
        >
          <span className="chat-link-text">
            <span className="chat-link-label">{l.label}</span>
            {l.hint && <span className="chat-link-hint">{l.hint}</span>}
          </span>
          <ArrowUpRight className="chat-link-icon" aria-hidden />
        </a>
      ))}
    </div>
  );
}

/* ── Painting carousel (in the transcript) ─────────────────────────────── */

export function ChatPaintingCarousel({
  items,
  reducedMotion,
  onOpen,
  onNavigate,
}: {
  items: ChatPainting[];
  reducedMotion: boolean;
  onOpen: (index: number) => void;
  onNavigate: (href: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const frame = useRef(0);
  const single = items.length === 1;

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (trackRef.current) setActive(nearestIndex(trackRef.current));
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      const idx = Math.max(0, Math.min(items.length - 1, i));
      const slide = track.children[idx] as HTMLElement | undefined;
      if (!slide) return;
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
      setActive(idx);
    },
    [items.length, reducedMotion],
  );

  // Galleries the slides belong to → one "open gallery" link (when unambiguous).
  const galleries = Array.from(new Set(items.map((a) => a.gallery)));
  const home = galleries.length === 1 ? GALLERY_LOCATIONS[galleries[0]] : undefined;

  return (
    <section
      className={`chat-carousel${single ? ' chat-carousel--single' : ''}`}
      role="region"
      aria-roledescription={single ? undefined : 'carousel'}
      aria-label={single ? items[0].title : `${items.length} artworks`}
    >
      {!single && (
        <header className="chat-carousel-head">
          <span className="chat-carousel-kicker">
            <Images className="h-3.5 w-3.5" aria-hidden />
            {items.length} artworks
          </span>
          <span className="chat-carousel-count" aria-live="polite">
            {active + 1} / {items.length}
          </span>
        </header>
      )}

      <div className="chat-carousel-viewport">
        <div
          ref={trackRef}
          className="chat-carousel-track"
          data-scrollable="true"
          tabIndex={single ? -1 : 0}
          role="group"
          aria-label={single ? undefined : 'Artworks carousel; swipe or use arrow keys to browse'}
          onScroll={onScroll}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              goTo(active + 1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              goTo(active - 1);
            } else if (e.key === 'Home') {
              e.preventDefault();
              goTo(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              goTo(items.length - 1);
            }
          }}
        >
          {items.map((art, i) => {
            const price = priceLabel(art);
            const status = statusOf(art);
            const accessibleLabel = [
              `View ${art.title}`,
              status ? `Status: ${status}` : null,
              price ? `Price: ${price}` : null,
              art.medium ? `Medium: ${art.medium}` : null,
            ]
              .filter(Boolean)
              .join(' — ');

            return (
              <div
                key={`${art.gallery}:${art.id}`}
                className="chat-slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}: ${art.title}`}
              >
                <button
                  type="button"
                  className="chat-slide-btn"
                  onClick={() => onOpen(i)}
                  onFocus={() => setActive(i)}
                  aria-label={accessibleLabel}
                >
                  <ChatImg src={art.src} alt={art.title} width={480} className="chat-slide-img" />
                  {status && <span className={`chat-slide-status chat-status--${status.toLowerCase()}`}>{status}</span>}
                  <span className="chat-slide-zoom" aria-hidden>
                    <Expand className="h-3.5 w-3.5" />
                  </span>
                  <span className="chat-slide-caption">
                    <span className="chat-slide-title">{art.title}</span>
                    {(price || art.medium) && (
                      <span className="chat-slide-meta">
                        {price && <span className="chat-slide-price">{price}</span>}
                        {art.medium && <span className="chat-slide-medium">{art.medium}</span>}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {!single && (
          <>
            <button
              type="button"
              className="chat-carousel-arrow chat-carousel-arrow--prev"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous artwork"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="chat-carousel-arrow chat-carousel-arrow--next"
              onClick={() => goTo(active + 1)}
              disabled={active === items.length - 1}
              aria-label="Next artwork"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {(!single || home) && (
        <footer className="chat-carousel-foot">
          {!single && items.length <= 12 && (
            <div className="chat-carousel-dots" role="group" aria-label="Artwork slides">
              {items.map((art, i) => (
                <button
                  key={`${art.gallery}:${art.id}`}
                  type="button"
                  aria-current={i === active ? 'true' : undefined}
                  aria-label={`Go to slide ${i + 1}: ${art.title}`}
                  className={`chat-carousel-dot${i === active ? ' is-active' : ''}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          )}
          {home && (
            <a
              href={home.href}
              className="chat-carousel-open"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onNavigate(home.href);
              }}
            >
              Open {home.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </footer>
      )}
    </section>
  );
}

/* ── Full-panel viewer (opens over the chat, never leaves it) ─────────── */

export function ChatPaintingViewer({
  items,
  index,
  waBase,
  onIndex,
  onClose,
  onNavigate,
  onOpenLightbox,
}: {
  items: ChatPainting[];
  index: number;
  /** wa.me base URL (no query) for the enquiry button. */
  waBase: string;
  onIndex: (i: number) => void;
  onClose: () => void;
  onNavigate: (href: string) => void;
  onOpenLightbox?: (art: ChatPainting) => void;
}) {
  const art = items[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number; target: HTMLElement | null } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const [copied, setCopied] = useState(false);
  const count = items.length;

  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const prev = useCallback(() => {
    resetZoom();
    onIndex((index - 1 + count) % count);
  }, [index, count, onIndex, resetZoom]);

  const next = useCallback(() => {
    resetZoom();
    onIndex((index + 1) % count);
  }, [index, count, onIndex, resetZoom]);

  const toggleZoom = useCallback(() => {
    if (isZoomed) {
      resetZoom();
    } else {
      setIsZoomed(true);
      setPan({ x: 0, y: 0 });
    }
  }, [isZoomed, resetZoom]);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  // Reset zoom on index change
  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  // Keyboard navigation: Escape exits zoom first or closes dialog; Tab trapped in dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        if (isZoomed) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (!isZoomed && count > 1 && e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (!isZoomed && count > 1 && e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (!isZoomed && count > 1 && e.key === 'Home') {
        e.preventDefault();
        onIndex(0);
      } else if (!isZoomed && count > 1 && e.key === 'End') {
        e.preventDefault();
        onIndex(count - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setIsZoomed(true);
      } else if (e.key === '-') {
        e.preventDefault();
        resetZoom();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (e.key === 'Tab' && rootRef.current) {
        const focusableEls = Array.from(
          rootRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
        if (focusableEls.length === 0) return;
        e.stopPropagation();
        e.preventDefault();
        const at = focusableEls.indexOf(document.activeElement as HTMLElement);
        const nextAt = e.shiftKey
          ? at <= 0
            ? focusableEls.length - 1
            : at - 1
          : at === -1 || at === focusableEls.length - 1
            ? 0
            : at + 1;
        focusableEls[nextAt].focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, next, prev, onIndex, count, isZoomed, resetZoom]);

  // Neighbour preload so swiping feels instant.
  useEffect(() => {
    if (count < 2) return;
    [items[(index + 1) % count], items[(index - 1 + count) % count]].forEach((a) => {
      const img = new Image();
      img.src = imageUrl(a.src, 960);
    });
  }, [index, items, count]);

  const shareArtwork = useCallback(async () => {
    if (!art) return;
    const home = GALLERY_LOCATIONS[art.gallery];
    const url = typeof window !== 'undefined' ? `${window.location.origin}${home ? home.href : '/sale'}` : '';
    const shareData = {
      title: `${art.title} — Anugruja Arts Studio`,
      text: `Check out "${art.title}" by Master Artist Anuradha Govarthanan at Anugruja Arts Studio.`,
      url,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
        return;
      } catch {}
    }

    // Direct DOM copy fallback for older browsers or restricted permissions
    if (copyToClipboardFallback(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }, [art]);

  // Pan interaction handlers when zoomed
  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    setIsDragging(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (!isZoomed || !isDragging || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.clientX;
    const dy = e.clientY - panStartRef.current.clientY;
    setPan({
      x: Math.max(-140, Math.min(140, panStartRef.current.startPanX + dx)),
      y: Math.max(-140, Math.min(140, panStartRef.current.startPanY + dy)),
    });
  };

  const handleStageMouseUp = () => {
    setIsDragging(false);
    panStartRef.current = null;
  };

  if (!art) return null;
  const price = priceLabel(art);
  const status = statusOf(art);
  const home = GALLERY_LOCATIONS[art.gallery];
  const wa = getWhatsAppEnquiryUrl(art, waBase);

  return (
    <div
      ref={rootRef}
      className="chat-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${art.title} — artwork viewer`}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          touch.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            target: e.target as HTMLElement | null,
          };
          if (isZoomed) {
            setIsDragging(true);
            panStartRef.current = {
              clientX: e.touches[0].clientX,
              clientY: e.touches[0].clientY,
              startPanX: pan.x,
              startPanY: pan.y,
            };
          }
        }
      }}
      onTouchMove={(e) => {
        if (isZoomed && isDragging && panStartRef.current && e.touches.length === 1) {
          const dx = e.touches[0].clientX - panStartRef.current.clientX;
          const dy = e.touches[0].clientY - panStartRef.current.clientY;
          setPan({
            x: Math.max(-140, Math.min(140, panStartRef.current.startPanX + dx)),
            y: Math.max(-140, Math.min(140, panStartRef.current.startPanY + dy)),
          });
        }
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        setIsDragging(false);
        panStartRef.current = null;

        if (!start || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        const isInfoSection = Boolean(start.target?.closest('.chat-viewer-info'));

        // If zoomed in, do NOT switch slides or dismiss to protect detail inspection
        if (isZoomed) return;

        if (count > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          (dx < 0 ? next : prev)();
        } else if (!isInfoSection && dy > 70 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          onClose();
        }
      }}
    >
      <div className="chat-viewer-bar">
        <span className="chat-viewer-count">{count > 1 ? `${index + 1} / ${count}` : 'Artwork'}</span>
        <span className="chat-viewer-kbd-hint" aria-hidden>
          <kbd>Esc</kbd> close &nbsp; <kbd>←</kbd> <kbd>→</kbd> browse &nbsp; <kbd>+</kbd> <kbd>-</kbd> zoom
        </span>
        <div className="chat-viewer-bar-actions">
          <button
            type="button"
            className={`chat-viewer-bar-btn${isZoomed ? ' is-active' : ''}`}
            onClick={toggleZoom}
            aria-label={isZoomed ? 'Zoom out (reset zoom)' : 'Zoom in to inspect details'}
            title={isZoomed ? 'Zoom out (reset zoom)' : 'Zoom in to inspect details'}
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>
          {onOpenLightbox && (
            <button
              type="button"
              className="chat-viewer-bar-btn"
              onClick={() => onOpenLightbox(art)}
              aria-label="Open in full studio lightbox"
              title="Open in full studio lightbox"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <a
            href={art.src}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-viewer-bar-btn"
            aria-label="Open original high-resolution photo in new tab"
            title="Open original photo in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            ref={closeRef}
            type="button"
            className="chat-viewer-close"
            onClick={onClose}
            aria-label="Back to chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={`chat-viewer-stage${isZoomed ? ' is-zoomed' : ''}${isDragging ? ' is-dragging' : ''}`}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onClick={(e) => {
          // Double-click/double-tap to toggle zoom
          const now = Date.now();
          if (now - lastTapRef.current < 320) {
            e.stopPropagation();
            toggleZoom();
            lastTapRef.current = 0;
            return;
          }
          lastTapRef.current = now;
          if (!isZoomed) toggleZoom();
        }}
      >
        <div
          className="chat-viewer-img-wrap"
          style={
            isZoomed
              ? {
                  transform: `scale(1.8) translate(${pan.x / 1.8}px, ${pan.y / 1.8}px)`,
                }
              : undefined
          }
        >
          <ChatImg
            key={art.src}
            src={art.src}
            alt={art.title}
            width={960}
            className={`chat-viewer-img${isZoomed ? ' is-zoomed' : ''}`}
          />
        </div>

        {isZoomed && (
          <div className="chat-viewer-zoom-badge" aria-live="polite">
            <span>1.8x · Drag to pan</span>
            <button
              type="button"
              className="chat-viewer-zoom-reset"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        )}

        {!isZoomed && count > 1 && (
          <>
            <button
              type="button"
              className="chat-viewer-arrow chat-viewer-arrow--prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous artwork"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="chat-viewer-arrow chat-viewer-arrow--next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next artwork"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="chat-viewer-info" data-scrollable="true">
        <div className="chat-viewer-heading">
          <p className="chat-viewer-title">{art.title}</p>
          {status && <span className={`chat-slide-status chat-status--${status.toLowerCase()} is-inline`}>{status}</span>}
        </div>
        {(price || art.medium || art.dimensions) && (
          <p className="chat-viewer-meta">
            {[price, art.medium, art.dimensions].filter(Boolean).join(' · ')}
          </p>
        )}
        {art.gallery === 'sale' && !isPriceConfirmed(art) && (
          <p className="chat-viewer-note">Contact the studio for the actual cost</p>
        )}
        {art.description && <p className="chat-viewer-desc">{art.description}</p>}
        <div className="chat-viewer-actions">
          {home && (
            <a
              href={home.href}
              className="chat-viewer-action chat-viewer-action--ghost"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onNavigate(home.href);
              }}
            >
              View on {home.label} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          )}
          {wa && status !== 'Sold' && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-viewer-action chat-viewer-action--wa"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> Enquire
            </a>
          )}
          <button
            type="button"
            className="chat-viewer-action chat-viewer-action--share"
            onClick={shareArtwork}
            aria-label={copied ? 'Link copied to clipboard' : 'Share or copy artwork link'}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" aria-hidden /> Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" aria-hidden /> Share
              </>
            )}
          </button>
        </div>
      </div>

      {!isZoomed && count > 1 && count <= 12 && (
        <div className="chat-viewer-dots" aria-hidden>
          {items.map((a, i) => (
            <span
              key={`${a.gallery}:${a.id}`}
              className={`chat-carousel-dot${i === index ? ' is-active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
