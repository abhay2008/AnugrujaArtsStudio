'use client';

import { useState } from 'react';
import Image from 'next/image';
import InteractiveSlideshow from '@/components/InteractiveSlideshow';
import ContactActionButtons from '@/components/ContactActionButtons';
import { achievementGallery } from '@/data/artData';
import { Award, Globe, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export default function AboutArtistClient() {
  const [readMore, setReadMore] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-blippo text-4xl md:text-6xl text-[#ffe76c] font-black tracking-wide">
          About us
        </h1>
        <p className="font-blippo text-xl md:text-2xl text-[#fdf5cf] font-bold">
          Anuradha Govarthanan — A Professional Artist
        </p>
      </div>

      {/* Artist Biography */}
      <section className="p-6 md:p-10 rounded-2xl bg-[#1b0629]/85 border border-studio-gold/30 shadow-2xl backdrop-blur-sm space-y-6">
        <h2 className="font-luminari text-2xl md:text-3xl text-[#f0ae2a]">
          About Artist
        </h2>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative w-44 h-44 md:w-56 md:h-56 flex-shrink-0 mx-auto rounded-3xl overflow-hidden border-2 border-studio-gold shadow-xl">
            <Image
              src="/images/image.png"
              alt="Anuradha Govarthanan Portrait"
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="flex-1 space-y-4 text-yellow-50/90 leading-relaxed text-base md:text-lg">
            <p className="text-justify">
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
              <div className="space-y-4 pt-2 text-justify animate-fadeIn">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-studio-purple hover:bg-purple-800 border border-purple-300 text-yellow-200 font-medium transition-all shadow-md cursor-pointer"
            >
              <span>{readMore ? 'Read Less' : 'Read More'}</span>
              {readMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-[#f0df2a]" />
          <h2 className="font-luminari text-2xl md:text-4xl text-[#f0df2a]">
            Achievements &amp; Honours
          </h2>
        </div>
        <p className="text-yellow-100/80 text-lg">
          With more than 7+ years of dedicated studio practice, Anuradha Govarthanan has received
          numerous awards and nationwide critical acclaim:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#1d082c] border border-studio-gold/30 flex items-start gap-3">
            <span className="text-studio-gold text-xl font-bold">•</span>
            <p className="font-medium text-[#f6ffa1]">
              <strong>Best Paintings Award 2022</strong> given by Kalakaar Foundation, New Delhi.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#1d082c] border border-studio-gold/30 flex items-start gap-3">
            <span className="text-studio-gold text-xl font-bold">•</span>
            <p className="font-medium text-[#f6ffa1]">
              <strong>Sri PV Narasimha Rao Excellency Award 2022</strong>.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#1d082c] border border-studio-gold/30 flex items-start gap-3">
            <span className="text-studio-gold text-xl font-bold">•</span>
            <p className="font-medium text-[#f6ffa1]">
              <strong>Finalist Award</strong> from Teravana International Online Juried Exhibition 2024.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#1d082c] border border-studio-gold/30 flex items-start gap-3">
            <span className="text-studio-gold text-xl font-bold">•</span>
            <p className="font-medium text-[#f6ffa1]">
              <strong>Golden Award</strong> from National All India Competition by Shiny Colours, Bangalore.
            </p>
          </div>
        </div>
      </section>

      {/* Exhibitions */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-[#f0df2a]" />
          <h2 className="font-luminari text-2xl md:text-4xl text-[#f0df2a]">
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
              className="p-4 rounded-xl bg-[#160523] border border-yellow-500/20 text-[#e8eb48] font-semibold text-center hover:border-studio-gold transition-all"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Art Workshops Gallery */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#f0df2a]" />
          <h2 className="font-luminari text-2xl md:text-4xl text-[#f0df2a]">
            Art Workshops &amp; Masterclasses
          </h2>
        </div>

        <blockquote className="p-6 rounded-2xl bg-[#230935]/80 border-l-4 border-studio-gold space-y-2 text-yellow-100/90 text-lg italic">
          <p>• Conducted workshops for students of foreign exchange program in University of Hyderabad</p>
          <p>• Conducted corporate workshops in multinational corporations (MNC)</p>
          <p>• Mentored hundreds of students spanning beginners, teenagers to senior citizens</p>
          <p>• Participated in Residential Workshop of Kashmir, witnessed by Cultural Minister</p>
        </blockquote>

        <InteractiveSlideshow items={achievementGallery} />
      </section>

      {/* Contact buttons */}
      <ContactActionButtons />
    </div>
  );
}
