'use client';

import Image from 'next/image';
import Carousel3D from '@/components/Carousel3D';
import ContactActionButtons from '@/components/ContactActionButtons';
import { classGallery, watercolorGallery, studioMeta } from '@/data/artData';
import { useLightbox } from '@/components/LightboxContext';
import { GraduationCap, Droplet, Brush, MessageCircle } from 'lucide-react';

function Inquiry({ course }: { course: string }) {
  const href = studioMeta.whatsappWaMe ? `${studioMeta.whatsappWaMe}?text=${encodeURIComponent(`Hello, I’d like to enquire about ${course}. Please share fees, timings and admission details.`)}` : studioMeta.whatsappUrl;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="course-inquiry"><MessageCircle className="h-4 w-4" />Enquire about this course</a>;
}

export default function ClassesClient() {
  const { openLightbox } = useLightbox();
  return (
    <div className="courses-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 space-y-8 sm:space-y-10">
      <header className="text-center space-y-2">
        <p className="section-kicker">The Anugruja Art School</p>
        <h1 className="font-decorative font-bold">Classes &amp; Courses</h1>
        <p className="font-editorial text-xl sm:text-2xl">Anuradha Govarthanan · Master Artist &amp; Mentor</p>
        <p className="text-sm text-[var(--text-muted)]">Learn online worldwide or in person at the studio. Ages 7–70+.</p>
        <nav aria-label="Course tracks" className="flex flex-wrap justify-center gap-2 pt-2">
          <a href="#online" className="course-tag min-h-[44px] inline-flex items-center">Ongoing classes</a>
          <a href="#water" className="course-tag min-h-[44px] inline-flex items-center">Watercolour mastery</a>
          <a href="#short" className="course-tag min-h-[44px] inline-flex items-center">Art fundamentals</a>
        </nav>
      </header>

      <section id="online" className="course-track glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3"><GraduationCap className="h-6 w-6 shrink-0" /><h2 className="font-decorative font-bold">Online &amp; Offline Ongoing Classes</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="course-module">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-editorial font-semibold text-xl">Young artists</h3><span className="course-tag">Ages 7–15</span></div>
            <p className="mt-2 text-sm">Twice-weekly sessions for children under 15: pencil, coloured pencils, watercolour and soft pastel.</p>
          </article>
          <article className="course-module">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-editorial font-semibold text-xl">Adults &amp; lifelong learners</h3><span className="course-tag">Ages 15–70+</span></div>
            <p className="mt-2 text-sm">Weekly adult sessions exploring charcoal, watercolour, acrylic and oil painting. Timings are arranged with the studio.</p>
          </article>
        </div>
        <Inquiry course="online and offline ongoing art classes" />
        <div className="course-showcase">
          <h3 className="font-editorial text-xl text-center mb-2">Student Works &amp; Class Milestones</h3>
          <Carousel3D items={classGallery} variant="rail" showInfo={false} autoAdvanceIntervalMs={0} />
        </div>
      </section>

      <section id="water" className="course-track glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3"><Droplet className="h-6 w-6 shrink-0" /><h2 className="font-decorative font-bold">Unzipping Watercolour Mastery</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="course-module"><span className="course-tag">3-month foundational</span><h3 className="font-editorial text-xl font-semibold mt-2">Build a confident foundation</h3><p className="text-sm mt-1">Art fundamentals, colour theory, transparent washes, glazing and wet-on-wet techniques.</p></article>
          <article className="course-module"><span className="course-tag">6-month professional</span><h3 className="font-editorial text-xl font-semibold mt-2">Deepen your practice</h3><p className="text-sm mt-1">Comprehensive handling of the medium, developing impressionistic, landscape and photorealistic approaches.</p></article>
        </div>
        <Inquiry course="the 3-month or 6-month watercolour course" />
        <div className="course-showcase"><Carousel3D items={watercolorGallery} variant="rail" showInfo={false} autoAdvanceIntervalMs={0} /></div>
      </section>

      <section id="short" className="course-track glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3"><Brush className="h-6 w-6 shrink-0" /><h2 className="font-decorative font-bold">Art Fundamentals &amp; Sketching</h2></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px] items-start">
          <div className="course-module"><span className="course-tag">2-month intensive</span><h3 className="font-editorial text-xl font-semibold mt-2">See, understand, draw</h3><ul className="mt-2 list-disc pl-5 space-y-1 text-sm"><li>Forms, light and shadow</li><li>One-, two- and three-point perspective</li><li>Theory and practical sketching</li><li>Graphite, charcoal and pencil</li></ul><div className="mt-4"><Inquiry course="the 2-month art fundamentals and sketching program" /></div></div>
          <button type="button" onClick={() => openLightbox('/images/sc.jpeg', 'Art Fundamentals & Sketching Syllabus')} className="course-syllabus relative h-[220px] w-full overflow-hidden rounded-xl border border-[var(--border-strong)]" aria-label="Enlarge the sketching course syllabus">
            <Image src="/images/sc.jpeg" alt="Art fundamentals and sketching syllabus" fill sizes="(max-width: 640px) 90vw, 220px" className="object-contain p-2" />
            <span className="absolute bottom-2 inset-x-2 course-tag">Tap to view syllabus</span>
          </button>
        </div>
      </section>
      <p className="text-center text-sm text-[var(--text-muted)]">Fees, batch availability and exact schedules are confirmed personally by the studio.</p>
      <ContactActionButtons />
    </div>
  );
}
