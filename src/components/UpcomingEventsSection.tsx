'use client';

import { CalendarDays, Clock3, ExternalLink, MapPin, Users } from 'lucide-react';
import { useLightbox } from '@/components/LightboxContext';
import type { StudioEvent } from '@/lib/types';

function eventImages(event: StudioEvent): string[] {
  const images = event.images?.filter(Boolean) ?? [];
  if (images.length > 0) return images;
  return event.image ? [event.image] : [];
}

export default function UpcomingEventsSection({ events }: { events: StudioEvent[] }) {
  const { openGallery } = useLightbox();
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="registration-events-heading" className="registration-events space-y-5">
      <div className="registration-events-heading text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass-pill px-3 py-1 text-section-kicker text-studio-sunset">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>What&apos;s Coming Up</span>
        </div>
        <h3 id="registration-events-heading" className="mt-2 font-decorative text-2xl font-bold text-studio-gold sm:text-3xl">
          Register for New Events, Workshops &amp; Exhibitions
        </h3>
        <p className="mx-auto mt-2 max-w-2xl font-editorial text-base text-theme-muted sm:text-lg">
          Reserve your place in the studio&apos;s next experiences. Each event below includes its dates,
          registration window and a glimpse of what awaits.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {events.map((event) => {
          const images = eventImages(event);
          const slides = images.map((src) => ({
            src,
            title: event.title,
            description: event.description,
            category: event.eventType || 'Studio event',
          }));

          return (
            <article key={event.id} className="registration-event-card glass-panel-sunset overflow-hidden rounded-3xl border border-studio-gold/20 shadow-xl">
              {images.length > 0 && (
                <div className={`registration-event-images ${images.length > 1 ? 'is-gallery' : ''}`}>
                  {images.slice(0, 3).map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      className="registration-event-image group"
                      onClick={() => openGallery(slides, index)}
                      aria-label={`View ${event.title} photo ${index + 1} larger`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${event.title} — photo ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} />
                      <span className="registration-event-image-hint" aria-hidden>View larger</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {event.eventType && (
                      <span className="text-section-kicker font-semibold uppercase tracking-[0.16em] text-studio-sunset">
                        {event.eventType}
                      </span>
                    )}
                    <h4 className="mt-1 font-decorative text-xl font-bold leading-tight text-studio-gold sm:text-2xl">
                      {event.title}
                    </h4>
                  </div>
                  {event.seatsRemaining !== undefined && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                      <Users className="h-3.5 w-3.5" />
                      {event.seatsRemaining} {event.seatsRemaining === 1 ? 'seat' : 'seats'} left
                    </span>
                  )}
                </div>

                <p className="mt-3 font-editorial text-base leading-relaxed text-theme-muted">
                  {event.description}
                </p>

                <div className="registration-event-details mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="registration-event-detail">
                    <CalendarDays className="h-4 w-4 text-studio-sunset" />
                    <span><b>Event date</b>{event.date}</span>
                  </div>
                  {event.registrationDeadline && (
                    <div className="registration-event-detail">
                      <Clock3 className="h-4 w-4 text-studio-sunset" />
                      <span><b>Register by</b>{event.registrationDeadline}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="registration-event-detail sm:col-span-2">
                      <MapPin className="h-4 w-4 text-studio-sunset" />
                      <span><b>Venue</b>{event.location}</span>
                    </div>
                  )}
                </div>

                {event.registrationUrl && (
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="registration-event-cta mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-sans-ui text-sm font-bold sm:w-auto"
                  >
                    Register now
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
