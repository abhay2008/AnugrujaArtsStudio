import { upcomingEvents, studioMeta } from '@/data/artData';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://anugruja-arts-studio.vercel.app').replace(/\/$/, '');

export default function SeoStructuredData() {
  const eventNodes = upcomingEvents
    .filter((event) => event.dateIso)
    .map((event) => ({
      '@type': 'Event',
      '@id': `${siteUrl}/#event-${event.id}`,
      name: event.title,
      description: event.description,
      startDate: event.dateIso,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: event.location || studioMeta.name,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'IN',
        },
      },
      organizer: {
        '@type': 'Person',
        name: studioMeta.founder,
        url: siteUrl,
      },
      image: event.images?.[0] ? `${siteUrl}${event.images[0]}` : `${siteUrl}/images/banner.jpeg`,
      url: `${siteUrl}/#workshops`,
    }));

  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: studioMeta.name,
      description: 'Original watercolor paintings, fine arts classes, workshops, and custom commissions.',
      publisher: { '@id': `${siteUrl}/#artist` },
      inLanguage: 'en-IN',
    },
    {
      '@type': ['Person', 'Organization'],
      '@id': `${siteUrl}/#artist`,
      name: studioMeta.founder,
      alternateName: studioMeta.name,
      url: siteUrl,
      image: `${siteUrl}/images/image.png`,
      email: studioMeta.email,
      telephone: studioMeta.whatsappNumber,
      sameAs: [studioMeta.instagramUrl, studioMeta.facebookUrl, studioMeta.youtubeUrl],
      knowsAbout: ['Watercolor painting', 'Realistic art', 'Fine arts education', 'Art workshops'],
      location: {
        '@type': 'Place',
        name: studioMeta.locationLabel,
        address: { '@type': 'PostalAddress', addressCountry: 'IN' },
      },
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${siteUrl}/#studio`,
      name: studioMeta.name,
      url: siteUrl,
      image: `${siteUrl}/images/banner.jpeg`,
      telephone: studioMeta.whatsappNumber,
      email: studioMeta.email,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Hyderabad',
        addressRegion: 'Telangana',
        addressCountry: 'IN',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 17.4735308, longitude: 78.3136112 },
      ...(studioMeta.mapsUrl ? { hasMap: studioMeta.mapsUrl } : {}),
      areaServed: ['Hyderabad', 'Telangana', 'India', 'Worldwide'],
      priceRange: '$$',
    },
    ...eventNodes,
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }}
    />
  );
}
