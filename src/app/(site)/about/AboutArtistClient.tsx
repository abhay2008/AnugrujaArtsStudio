'use client';

import { useState } from 'react';
import Image from 'next/image';
import Carousel3D from '@/components/Carousel3D';
import ContactActionButtons from '@/components/ContactActionButtons';
import { achievementGallery } from '@/data/artData';
import { Award, Globe, BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export default function AboutArtistClient() {
  const [readMore, setReadMore] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs text-studio-sunset mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Biography &amp; Studio Journey</span>
        </div>
        <h1 className="font-decorative text-4xl sm:text-6xl gold-sunset-shimmer font-bold tracking-wide">
          About us
        </h1>
        <p className="font-editorial text-xl sm:text-3xl text-amber-200 font-medium tracking-wide">
          Anuradha Govarthanan &mdash; Master Artist &amp; Founder
        </p>
      </div>

      {/* Artist Biography in Glassmorphic Panel */}
      <section className="glass-panel-sunset p-6 sm:p-10 rounded-3xl space-y-8 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 border-b border-studio-sunset/20 pb-4">
          <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
            About Artist
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex-shrink-0 rounded-3xl overflow-hidden border-2 border-studio-gold shadow-[0_0_35px_rgba(249,115,22,0.25)] bg-black/40">
            <Image
              src="/images/image.png"
              alt="Anuradha Govarthanan Portrait"
              fill
              sizes="(max-width: 768px) 192px, 224px"
              className="object-cover"
              priority
            />
          </div>

          {/* Paragraph copy reads in the site body font (Montserrat) —
              Playfair's thin strokes were too fine for small text. */}
          <div className="flex-1 space-y-4 text-base sm:text-lg text-yellow-50/95 leading-relaxed">
            <p className="text-justify sm:text-left">
              Anuradha Govarthanan was born and brought up in Chennai, Tamil Nadu. After completing
              her Bachelor&apos;s of Engineering degree from Vellore Institute of Technology (VIT)
              in Tamil Nadu, India, Anuradha embarked on a new chapter in her life as she entered
              into marriage. Despite the joy of starting a family, she found herself longing to
              reignite the flames of her artistic passion that had burned brightly within her since
              childhood. Amidst the whirlwind of domestic life, she carved out moments of
              solitude, stealing away to her art room to immerse herself in the world of colors and
              textures that had always been her sanctuary. With more than 7 years of professional
              experience, with each brushstroke, she rediscovered the joy and fulfillment that had
              once fueled her artistic pursuits.
            </p>

            {readMore && (
              <div className="space-y-4 pt-2 text-justify sm:text-left animate-fadeIn">
                <p>
                  Seeing her immense passion for arts, her husband suggested pursuing some
                  art-related courses. Anuradha decided to do a diploma in fashion designing. After a
                  few years of completing the course from Hamstech Institute of Fashion Design,
                  Hyderabad, she decided to open her boutique. As the years passed, Anuradha&apos;s
                  passion for arts flourished once again, fueled by the love and support of her
                  family. She started to explore a lot of art forms. Her artwork became not only a
                  creative outlet but also a means of self-expression and exploration.
                </p>
                <p>
                  She underwent a lot of rejections and discouragements, which made her stronger
                  eventually. She started to exhibit her artworks in various shows and galleries from
                  2019. With renewed determination, she embraced her identity as an artist, weaving
                  her experiences of marriage and motherhood into her artistic narrative. That&apos;s
                  how the watercolor medium became her enemy. She wanted to make that enemy her friend;
                  with the help of various experts and her inner confidence, she made watercolor her
                  bestie. She started teaching arts for kids and adults to cover up her art needs and
                  expenses.
                </p>
                <p>
                  Simultaneously she was in the learning phase to master the Realistic style in
                  watercolor. After going through various stages of learning, she decided to open her
                  own art studio: <strong>Anugruja Arts Studio</strong>. Anuradha gained deep
                  confidence in arts and started receiving recognition from renowned artists worldwide.
                  Finding balance between her roles as a wife, mother, and master artist, she embarked
                  on a journey of self-discovery where love, creativity, and fulfillment intertwine to
                  create a masterpiece of existence.
                </p>
              </div>
            )}

            <button
              onClick={() => setReadMore(!readMore)}
              className="touch-target min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl glass-btn-gold text-studio-gold font-blippo text-sm transition-all cursor-pointer"
            >
              <span>{readMore ? 'Read Less' : 'Read More'}</span>
              {readMore ? <ChevronUp className="w-4 h-4 text-studio-sunset" /> : <ChevronDown className="w-4 h-4 text-studio-sunset" />}
            </button>
          </div>
        </div>
      </section>

      {/* Achievements & Honours */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-studio-sunset" />
          <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
            Achievements &amp; Honours
          </h2>
        </div>
        <p className="font-editorial text-amber-100/90 text-lg sm:text-xl">
          With more than 7+ years of dedicated studio practice, Anuradha Govarthanan has received
          numerous awards and nationwide critical acclaim:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Best Paintings Award 2022',
              desc: 'Given by Kalakaar Foundation, New Delhi.',
            },
            {
              title: 'Sri PV Narasimha Rao Excellency Award 2022',
              desc: 'Awarded for extraordinary contributions to fine arts.',
            },
            {
              title: 'Finalist Award 2024',
              desc: 'Teravana International Online Juried Exhibition.',
            },
            {
              title: 'Golden Award',
              desc: 'National All India Competition organized by Shiny Colours, Bangalore.',
            },
          ].map((honor, idx) => (
            <div
              key={idx}
              className="glass-card p-5 rounded-2xl border border-theme flex items-start gap-3.5 hover:border-studio-sunset/50 transition-all"
            >
              <span className="text-studio-sunset text-xl font-bold mt-0.5">•</span>
              <p className="text-base sm:text-lg text-yellow-50/95 leading-relaxed">
                <strong className="text-studio-gold">{honor.title}</strong> &mdash; {honor.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Selected Exhibitions */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-studio-sunset" />
          <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
            Selected Exhibitions
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            'Eshwaraiya Art Gallery, Hyderabad',
            'State Gallery of Arts, Hyderabad',
            'Kalakaar Foundation, New Delhi',
            'Tanu Nabunkar, Siliguri',
            'Fabriano Aquarelle, Italy (2021)',
            'Japan International Watercolor Institute, Japan (2022)',
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-card p-4 rounded-xl border border-theme text-amber-100 font-serif-display font-medium text-center text-sm sm:text-base hover:border-studio-gold/60 transition-all"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Art Workshops Gallery */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-studio-sunset" />
          <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
            Art Workshops &amp; Masterclasses
          </h2>
        </div>

        <div className="glass-panel-sunset p-6 sm:p-8 rounded-3xl border border-studio-sunset/30 space-y-3 font-editorial text-base sm:text-xl text-yellow-50/95 italic">
          <p className="flex items-start gap-2">
            <span className="text-studio-sunset not-italic">•</span>
            <span>Conducted workshops for students of foreign exchange program in University of Hyderabad</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-studio-sunset not-italic">•</span>
            <span>Conducted corporate workshops in multinational corporations (MNC)</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-studio-sunset not-italic">•</span>
            <span>Mentored hundreds of students spanning beginners, teenagers to senior citizens</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-studio-sunset not-italic">•</span>
            <span>Participated in Residential Workshop of Kashmir, witnessed by Cultural Minister</span>
          </p>
        </div>

        <div className="rounded-3xl">
          <Carousel3D items={achievementGallery} showInfo={false} />
        </div>
      </section>

      {/* Contact buttons */}
      <ContactActionButtons />
    </div>
  );
}
