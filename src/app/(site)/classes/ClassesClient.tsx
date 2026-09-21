'use client';

import Image from 'next/image';
import Carousel3D from '@/components/Carousel3D';
import AutoScroller from '@/components/AutoScroller';
import ContactActionButtons from '@/components/ContactActionButtons';
import { classGallery, watercolorGallery } from '@/data/artData';
import { useLightbox } from '@/components/LightboxContext';
import { GraduationCap, Droplet, Brush, CheckCircle, Clock, Users, Sparkles } from 'lucide-react';

export default function ClassesClient() {
  const { openLightbox } = useLightbox();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs text-studio-sunset mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curriculum &amp; Masterclasses</span>
        </div>
        <h1 className="font-decorative text-4xl sm:text-6xl gold-sunset-shimmer font-bold tracking-wide">
          Classes &amp; Courses
        </h1>
        <p className="font-editorial text-xl sm:text-3xl text-amber-200 font-medium">
          Anuradha Govarthanan &mdash; Master Artist &amp; Mentor
        </p>
        <p className="font-editorial text-lg sm:text-xl text-studio-gold/90 italic">
          Online-Offline, Watercolour &amp; Comprehensive Fine Arts Programs
        </p>
      </div>

      {/* 1. Online & Offline Classes */}
      <section id="online" className="glass-panel-sunset p-6 sm:p-10 rounded-3xl space-y-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-studio-sunset/20 pb-4">
          <GraduationCap className="w-8 h-8 text-studio-sunset" />
          <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
            Online &amp; Offline Classes
          </h2>
        </div>

        {/* Course highlights in glass cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-theme space-y-2 hover:border-studio-sunset/50 transition-all">
            <div className="flex items-center gap-2.5 text-studio-gold font-blippo font-bold text-base sm:text-lg">
              <CheckCircle className="w-5 h-5 text-studio-sunset" />
              <span>Global Accessibility</span>
            </div>
            <p className="text-yellow-100/90 text-sm sm:text-base leading-relaxed">
              Classes are conducted online, accommodating students worldwide at their preferred timings.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-theme space-y-2 hover:border-studio-sunset/50 transition-all">
            <div className="flex items-center gap-2.5 text-studio-gold font-blippo font-bold text-base sm:text-lg">
              <Clock className="w-5 h-5 text-studio-sunset" />
              <span>Age-specific Schedule</span>
            </div>
            <p className="text-yellow-100/90 text-sm sm:text-base leading-relaxed">
              Weekly classes: twice a week for kids under 15, and once a week for adults.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-theme space-y-2 hover:border-studio-sunset/50 transition-all">
            <div className="flex items-center gap-2.5 text-studio-gold font-blippo font-bold text-base sm:text-lg">
              <Users className="w-5 h-5 text-studio-sunset" />
              <span>All Age Groups (7 to 70+)</span>
            </div>
            <p className="text-yellow-100/90 text-sm sm:text-base leading-relaxed">
              Open to ages 7 and above, extending warmly to teenagers, adults, and senior citizens.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-theme space-y-2 hover:border-studio-sunset/50 transition-all">
            <div className="flex items-center gap-2.5 text-studio-gold font-blippo font-bold text-base sm:text-lg">
              <Brush className="w-5 h-5 text-studio-sunset" />
              <span>Mediums by Age Group</span>
            </div>
            <p className="text-yellow-100/90 text-sm sm:text-base leading-relaxed">
              <strong>Kids (under 15):</strong> Pencil, colored pencils, watercolor, soft pastel.<br />
              <strong>Above 15:</strong> Charcoal, watercolor, acrylic, oil paintings.
            </p>
          </div>
        </div>

        {/* Student Art Gallery Slideshow */}
        <div className="pt-4">
          <p className="text-center text-studio-gold font-decorative text-xl sm:text-2xl mb-4">
            Student Works &amp; Class Milestones
          </p>
          <Carousel3D items={classGallery} showInfo={false} />
        </div>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-4xl mx-auto w-full" />

      {/* 2. Watercolor Courses */}
      <section id="water" className="glass-panel p-6 sm:p-10 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-studio-gold/20 pb-4">
          <Droplet className="w-8 h-8 text-studio-sunset" />
          <div>
            <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
              Watercolour Courses
            </h2>
            <p className="font-editorial text-lg sm:text-xl text-amber-200/90 italic">
              Develop your artistic watercolour mastery &amp; photorealistic techniques
            </p>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-theme space-y-3 text-sm sm:text-base text-yellow-100/90">
          <p className="font-decorative text-lg sm:text-xl gold-sunset-shimmer font-bold">Unzipping Watercolor Course</p>
          <ul className="space-y-2">
            <li>• <strong className="text-studio-gold">Course Options:</strong> Choose between 3 months foundational or 6 months comprehensive mastery.</li>
            <li>• <strong className="text-studio-gold">Course Content:</strong> Learn in-depth techniques of transparent watercolors. Covers art fundamentals, color theory, washes, glazing, and wet-on-wet mechanics.</li>
            <li>• <strong className="text-studio-gold">Outcome:</strong> Gain deep mastery in handling the medium with ability to paint in impressionistic, landscape, and photorealistic styles.</li>
          </ul>
        </div>

        <div className="pt-2">
          <AutoScroller items={watercolorGallery} itemHeight="h-72" />
        </div>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-4xl mx-auto w-full" />

      {/* 3. Short Term Courses */}
      <section id="short" className="glass-panel p-6 sm:p-10 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-studio-gold/20 pb-4">
          <Brush className="w-8 h-8 text-studio-sunset" />
          <div>
            <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
              Short Term Courses
            </h2>
            <p className="font-editorial text-lg sm:text-xl text-amber-200/90 italic">
              Learn the fundamentals of art, perspective, and sketching
            </p>
          </div>
        </div>

        <div
          onClick={() => openLightbox('/images/sc.jpeg', 'Short Term Course Syllabus')}
          className="relative max-w-md mx-auto h-[300px] sm:h-[380px] rounded-2xl overflow-hidden border-2 border-studio-gold/80 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all bg-studio-dark/90 group"
        >
          <Image
            src="/images/sc.jpeg"
            alt="Short Term Course Sketching"
            fill
            className="object-contain p-2"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="px-4 py-2 rounded-full glass-pill text-xs font-blippo text-studio-gold">
              Click to view syllabus
            </span>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-theme space-y-3 text-sm sm:text-base text-yellow-100/90">
          <p className="font-decorative text-lg sm:text-xl gold-sunset-shimmer font-bold">Art Fundamental and Sketching Program</p>
          <ul className="space-y-2">
            <li>• <strong className="text-studio-gold">Course Duration:</strong> 2 months intensive curriculum.</li>
            <li>• <strong className="text-studio-gold">Course Content:</strong> Learn the basics of sketching, forms, light &amp; shadows, and 1/2/3-point perspective both theoretically and practically. Mediums: Graphite, Charcoal, and Pencil.</li>
          </ul>
        </div>
      </section>

      {/* Contact buttons */}
      <ContactActionButtons />
    </div>
  );
}
