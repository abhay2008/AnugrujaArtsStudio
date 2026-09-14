'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { GraduationCap, Palette, Scissors, Quote } from 'lucide-react';
import { studioData } from '@/data/studioData';

const EASE = [0.16, 1, 0.3, 1] as const;

const EDUCATION_ICONS = [GraduationCap, Scissors];

/**
 * "The Master's Journey" — a cinematic, two-column editorial narrative.
 *
 * Left column is a sticky narrative stage (portrait, live chapter indicator,
 * credentials). Right column holds the scroll-driven chapter cards that
 * animate in with Framer Motion as they enter the viewport.
 */
export default function ArtistJourneySection() {
  const reducedMotion = useReducedMotion();
  const { artist, journey } = studioData;
  const { eyebrow, heading, metrics, chapters } = journey;
  const [activeIndex, setActiveIndex] = useState(0);

  const rise = (from: number) =>
    reducedMotion
      ? {}
      : { initial: { opacity: 0, y: from }, whileInView: { opacity: 1, y: 0 } };

  return (
    <section id="journey" className="atelier-journey-section" aria-labelledby="journey-heading">
      <motion.header
        className="journey-heading-wrap"
        {...(reducedMotion
          ? {}
          : {
              initial: { opacity: 0, y: 26 },
              whileInView: { opacity: 1, y: 0 },
              viewport: { once: true, amount: 0.6 },
            })}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <span className="eyebrow-gold">{eyebrow}</span>
        <h2 id="journey-heading" className="display-heading font-decorative">
          {heading}
        </h2>
        <span className="section-accent" aria-hidden />
      </motion.header>

      <div className="journey-sticky-grid">
        {/* ── Left: sticky narrative stage ── */}
        <div className="journey-profile-col">
          <div className="sticky-profile-card">
            <div className="profile-portrait">
              <Image
                src="/images/image.png"
                alt={`Portrait of ${artist.name}`}
                fill
                sizes="(max-width: 1023px) 40vw, 320px"
                className="object-cover"
              />
            </div>

            <span className="profile-eyebrow">{artist.title}</span>
            <h3 className="profile-name font-editorial">{artist.name}</h3>
            <p className="profile-role">Master Artist &amp; Founder</p>

            <p className="profile-mantra font-editorial">
              <Quote className="profile-mantra-mark h-3.5 w-3.5" aria-hidden />
              {artist.mantra}
            </p>

            <div className="profile-metrics">
              {metrics.map((metric) => (
                <div className="metric-pill" key={metric.label}>
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-val">{metric.value}</span>
                </div>
              ))}
            </div>

            <div className="credentials-box">
              <h4 className="credentials-title">Academic &amp; Atelier Pedigree</h4>
              <ul className="credentials-list">
                {artist.education.map((edu, i) => {
                  const Icon = EDUCATION_ICONS[i] ?? Palette;
                  return (
                    <li key={edu.degree}>
                      <Icon className="credentials-icon h-4 w-4" aria-hidden />
                      <span>
                        <strong>{edu.degree}</strong>
                        <em>{edu.institution}</em>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Live chapter indicator, driven by the chapter cards scrolling by */}
            <div className="chapter-rail" aria-hidden>
              {chapters.map((chapter, i) => (
                <span
                  key={chapter.num}
                  className="chapter-rail-tick"
                  data-active={i === activeIndex}
                />
              ))}
              <span className="chapter-rail-label">
                Chapter {chapters[activeIndex]?.num} / {String(chapters.length).padStart(2, '0')}
                <em>{chapters[activeIndex]?.tag}</em>
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: scroll-driven chapters ── */}
        <div className="journey-chapters-col">
          {chapters.map((chapter, index) => (
            <motion.article
              key={chapter.num}
              className="chapter-card"
              {...rise(52)}
              onViewportEnter={() => setActiveIndex(index)}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 0.8, ease: EASE, delay: reducedMotion ? 0 : 0.05 }}
            >
              <div className="chapter-header">
                <span className="chapter-tag">{chapter.tag}</span>
                <span className="chapter-num font-editorial">{chapter.num}</span>
              </div>
              <h3 className="chapter-title font-editorial">{chapter.title}</h3>
              <span className="chapter-sub">{chapter.subtitle}</span>
              <p className="chapter-body">{chapter.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
