'use client';

import { CalendarDays, Clock3, ExternalLink, MapPin, Users } from 'lucide-react';
import Carousel3D from '@/components/Carousel3D';
import { eventRegistrationLink } from '@/lib/inquiry';
import type { StudioEvent } from '@/lib/types';

function eventImages(event: StudioEvent): string[] {
  const images = event.images?.filter(Boolean) ?? [];
  if (images.length > 0) return images;
  return event.image ? [event.image] : [];
}

export default function UpcomingEventsSection({ events }: { events: StudioEvent[] }) {
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
          const slides = images.map((src, index) => ({
            id: `${event.id}-photo-${index}`,
            src,
            title: event.title,
            description: event.description,
            category: event.eventType || 'Studio event',
          }));

          return (
            <article key={event.id} className={`registration-event-card${images.length ? '' : ' registration-event-card--text'}`}>
              {images.length > 0 && (
                <div className="registration-event-gallery">
                  <Carousel3D
                    items={slides}
                    variant="deck"
                    showInfo={false}
                    label={`${event.title} event photos`}
                  />
                  <p className="registration-gallery-hint">Swipe to explore · Tap a photo to enlarge</p>
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
