'use client';

import { CalendarDays, Clock3, ExternalLink, MapPin, Users } from 'lucide-react';
import { useLightbox } from '@/components/LightboxContext';
import { eventRegistrationLink } from '@/lib/inquiry';
import { responsiveImage } from '@/lib/imageSrc';
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
    <section aria-labelledby="registration-events-heading" className="registration-events">
      <header className="registration-events-heading">
        <span className="eyebrow-gold">What&apos;s Coming Up</span>
        <h2 id="registration-events-heading" className="display-heading font-decorative">
          Register for New Events, Workshops &amp; Exhibitions
        </h2>
        <span className="section-accent" aria-hidden />
        <p className="registration-events-intro">
          Reserve your place in the studio&apos;s next creative experience.
        </p>
      </header>

      <div className="registration-events-list">
        {events.map((event) => {
          const images = eventImages(event);
          const slides = images.map((src) => ({
            src,
            title: event.title,
            description: event.description,
            category: event.eventType || 'Studio event',
          }));

          return (
            <article key={event.id} className="registration-event-card">
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
                      {/* WebP derivative at the width this slot actually uses, with
                          real dimensions so the card never shifts as it loads. */}
                      <img
                        {...responsiveImage(src, '(max-width: 640px) 92vw, 420px', 960)}
                        alt={`${event.title} — photo ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="registration-event-image-hint" aria-hidden>View larger</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="registration-event-content">
                <div className="registration-event-topline">
                  {event.eventType && <span className="registration-event-type">{event.eventType}</span>}
                  {event.seatsRemaining !== undefined && (
                    <span className="registration-event-seats">
                      <Users className="h-3.5 w-3.5" />
                      {event.seatsRemaining} {event.seatsRemaining === 1 ? 'seat' : 'seats'} left
                    </span>
                  )}
                </div>

                <h3 className="registration-event-title">{event.title}</h3>
                {event.description && <p className="registration-event-description">{event.description}</p>}

                <div className="registration-event-details">
                  <div className="registration-event-detail">
                    <CalendarDays aria-hidden />
                    <span><b>Event date</b>{event.date}</span>
                  </div>
                  {event.registrationDeadline && (
                    <div className="registration-event-detail">
                      <Clock3 aria-hidden />
                      <span><b>Register by</b>{event.registrationDeadline}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="registration-event-detail registration-event-detail-wide">
                      <MapPin aria-hidden />
                      <span><b>Venue</b>{event.location}</span>
                    </div>
                  )}
                </div>

                <a
                  href={eventRegistrationLink(event.title, event.date)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="registration-event-cta"
                >
                  Register now on WhatsApp
                  <ExternalLink aria-hidden />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
