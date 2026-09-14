'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Globe2, MapPin, Users2, BadgeCheck } from 'lucide-react';
import { studioData } from '@/data/studioData';

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section 4.5 — "The Proof of Mastery".
 * Awards ribbon · international exhibition ticker · outreach metric strip.
 * Every string comes from `studioData`, so the admin portal can rewrite the
 * archive without touching this file.
 */
export default function AccoladesSection() {
  const reducedMotion = useReducedMotion();
  const { achievements, exhibitions, outreach } = studioData;

  /* Ticker only needs the places that prove global reach. */
  const tickerStops = exhibitions.filter((ex) =>
    ['International', 'National', 'Festival', 'State'].includes(ex.type)
  );

  return (
    <section id="achievements" className="atelier-accolades-section" aria-labelledby="accolades-heading">
      <motion.header
        className="section-title-wrap"
        {...(reducedMotion
          ? {}
          : {
              initial: { opacity: 0, y: 26 },
              whileInView: { opacity: 1, y: 0 },
              viewport: { once: true, amount: 0.6 },
            })}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <span className="eyebrow-gold">Institutional Recognition</span>
        <h2 id="accolades-heading" className="display-heading font-decorative">
          Achievements &amp; Honours
        </h2>
        <span className="section-accent" aria-hidden />
        <p className="subheading-dim">
          Nationwide critical acclaim and international juried honors amassed across a
          seven-year studio practice
        </p>
      </motion.header>

      {/* ── Awards ribbon ── */}
      <div className="accolades-grid">
        {achievements.map((item, index) => (
          <motion.article
            key={`${item.year}-${item.title}`}
            className="accolade-card"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 18 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: EASE, delay: reducedMotion ? 0 : index * 0.12 }}
            whileHover={reducedMotion ? undefined : { y: -6 }}
          >
            {item.image && (
              <div className="accolade-artifact">
                <Image
                  src={item.image}
                  alt={`${item.title} — ${item.institution}`}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 300px"
                  className="accolade-artifact-img object-cover"
                />
                <span className="accolade-artifact-veil" aria-hidden />
              </div>
            )}

            <div className="accolade-head">
              <span className="accolade-year-badge">{item.year}</span>
              {item.image ? (
                <BadgeCheck className="accolade-seal h-5 w-5" aria-hidden />
              ) : (
                <Award className="accolade-seal h-5 w-5" aria-hidden />
              )}
            </div>
            <h3 className="accolade-title font-editorial">{item.title}</h3>
            <p className="accolade-inst">{item.institution}</p>
            <p className="accolade-desc">{item.significance}</p>
          </motion.article>
        ))}
      </div>

      {/* ── Global exhibition ticker ── */}
      <div className="exhibition-ticker" aria-hidden>
        <div className="exhibition-ticker-track">
          {[0, 1].map((copy) => (
            <div className="exhibition-ticker-run" key={copy}>
              {tickerStops.map((ex) => (
                <span className="ticker-stop" key={`${copy}-${ex.name}`}>
                  <Globe2 className="h-3.5 w-3.5" />
                  <strong>{ex.name}</strong>
                  <em>
                    {ex.location} · {ex.year}
                  </em>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Exhibitions + outreach ── */}
      <div className="exhibitions-outreach-grid">
        <div className="exhibition-panel">
          <h3 className="panel-title font-decorative">
            Selected International &amp; National Exhibitions
          </h3>
          <ul className="exhibition-list">
            {exhibitions.map((ex) => (
              <li className="exhibition-item" key={`${ex.name}-${ex.year}`}>
                <span className="ex-badge" data-type={ex.type.toLowerCase()}>
                  {ex.type}
                </span>
                <span className="ex-name">{ex.name}</span>
                <span className="ex-loc">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {ex.location}
                </span>
                <span className="ex-yr">{ex.year}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="outreach-panel">
          <h3 className="panel-title font-decorative">
            Masterclasses &amp; Educational Impact
          </h3>
          <div className="outreach-list">
            {outreach.map((out, i) => (
              <motion.div
                className="outreach-item"
                key={out.label}
                initial={reducedMotion ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, ease: EASE, delay: reducedMotion ? 0 : i * 0.09 }}
              >
                <span className="outreach-dot" aria-hidden>
                  <Users2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="outreach-label">{out.label}</h4>
                  <p className="outreach-detail">{out.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
