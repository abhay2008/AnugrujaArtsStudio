'use client';

import Image from 'next/image';
import InteractiveSlideshow from '@/components/InteractiveSlideshow';
import AutoScroller from '@/components/AutoScroller';
import ContactActionButtons from '@/components/ContactActionButtons';
import { classGallery, watercolorGallery } from '@/data/artData';
import { useLightbox } from '@/components/LightboxContext';
import { GraduationCap, Droplet, Brush, CheckCircle, Clock, Users } from 'lucide-react';

export default function ClassesClient() {
  const { openLightbox } = useLightbox();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="font-blippo text-4xl md:text-6xl text-[#ffe76c] font-black tracking-wide">
          Classes &amp; Courses
        </h1>
        <p className="font-blippo text-xl md:text-2xl text-[#fdf5cf] font-bold">
          Anuradha Govarthanan — A Professional Artist
        </p>
        <p className="font-luminari text-xl text-[#d1a515]">
          Online-Offline, Watercolour &amp; Comprehensive Fine Arts Courses
        </p>
      </div>

      {/* 1. Online & Offline Classes */}
      <section id="online" className="p-6 md:p-10 rounded-2xl bg-[#1c072c]/90 border border-studio-gold/30 shadow-2xl backdrop-blur-sm space-y-8">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-[#f9d938]" />
          <h2 className="font-blippo text-3xl md:text-4xl text-[#f9d938]">
            Online &amp; Offline Classes
          </h2>
        </div>

        {/* Course highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-[#f6ffa1]">
          <div className="p-4 rounded-xl bg-[#2a0b41]/60 border border-purple-400/20 space-y-2">
            <div className="flex items-center gap-2 text-[#d1a515] font-bold text-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Global Accessibility</span>
            </div>
            <p className="text-yellow-100/90 text-sm">
              Classes are conducted online, accommodating students worldwide at their preferred timings.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#2a0b41]/60 border border-purple-400/20 space-y-2">
            <div className="flex items-center gap-2 text-[#d1a515] font-bold text-lg">
              <Clock className="w-5 h-5" />
              <span>Age-specific Schedule</span>
            </div>
            <p className="text-yellow-100/90 text-sm">
              Weekly classes: twice a week for kids under 15, and once a week for adults.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#2a0b41]/60 border border-purple-400/20 space-y-2">
            <div className="flex items-center gap-2 text-[#d1a515] font-bold text-lg">
              <Users className="w-5 h-5" />
              <span>All Age Groups (7 to 70+)</span>
            </div>
            <p className="text-yellow-100/90 text-sm">
              Open to ages 7 and above, extending warmly to senior citizens.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#2a0b41]/60 border border-purple-400/20 space-y-2">
            <div className="flex items-center gap-2 text-[#d1a515] font-bold text-lg">
              <Brush className="w-5 h-5" />
              <span>Mediums by Age Group</span>
            </div>
            <p className="text-yellow-100/90 text-sm">
              <strong>Kids (under 15):</strong> Pencil, colored pencils, watercolor, soft pastel.<br />
              <strong>Above 15:</strong> Charcoal, watercolor, acrylic, oil paintings.
            </p>
          </div>
        </div>

        {/* Student Art Gallery Slideshow */}
        <div className="pt-4">
          <p className="text-center text-studio-gold font-blippo text-xl mb-4">
            Student Works &amp; Class Milestones
          </p>
          <InteractiveSlideshow items={classGallery} />
        </div>
      </section>

      <hr className="border-t border-studio-gold/20" />

      {/* 2. Watercolor Courses */}
      <section id="water" className="p-6 md:p-10 rounded-2xl bg-[#1c072c]/90 border border-studio-gold/30 shadow-2xl backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3">
          <Droplet className="w-8 h-8 text-[#d1a515]" />
          <div>
            <h2 className="font-luminari text-3xl md:text-4xl text-[#d1a515]">
              Watercolour Courses
            </h2>
            <p className="font-luminari text-xl text-[#fad767]">
              Develop your artistic watercolour skills
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#26093b]/70 border border-purple-300/30 space-y-3 text-base text-[#f6ffa1]">
          <p className="font-black text-xl text-[#d1d115]">Unzipping Watercolor Course</p>
          <ul className="space-y-2 text-yellow-100/90">
            <li>• <strong className="text-studio-gold">Course Options:</strong> Choose between 3 months or 6 months duration.</li>
            <li>• <strong className="text-studio-gold">Course Content:</strong> Learn in-depth techniques of transparent watercolors. Covers art fundamentals, color theory, washes, and wet-on-wet mechanics.</li>
            <li>• <strong className="text-studio-gold">Outcome:</strong> Gain deep mastery in handling the medium with ability to paint in impressionistic and photorealistic styles.</li>
          </ul>
        </div>

        <AutoScroller items={watercolorGallery} itemHeight="h-72" />
      </section>

      <hr className="border-t border-studio-gold/20" />

      {/* 3. Short Term Courses */}
      <section id="other" className="p-6 md:p-10 rounded-2xl bg-[#1c072c]/90 border border-studio-gold/30 shadow-2xl backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3">
          <Brush className="w-8 h-8 text-[#d1a515]" />
          <div>
            <h2 className="font-luminari text-3xl md:text-4xl text-[#d1a515]">
              Short Term Courses
            </h2>
            <p className="font-luminari text-xl text-[#fad767]">
              Learn the fundamentals of art and sketching
            </p>
          </div>
        </div>

        <div
          onClick={() => openLightbox('/images/sc.jpeg', 'Short Term Course Syllabus')}
          className="relative max-w-lg mx-auto h-[320px] md:h-[400px] rounded-2xl overflow-hidden border-2 border-studio-gold shadow-2xl cursor-pointer hover:scale-105 transition-transform"
        >
          <Image
            src="/images/sc.jpeg"
            alt="Short Term Course Sketching"
            fill
            className="object-contain p-2"
          />
        </div>

        <div className="p-5 rounded-xl bg-[#26093b]/70 border border-purple-300/30 space-y-3 text-base text-[#f6ffa1]">
          <p className="font-black text-xl text-studio-gold">Art Fundamental and Sketching Program</p>
          <ul className="space-y-2 text-yellow-100/90">
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
