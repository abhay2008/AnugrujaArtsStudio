'use client';

import React, { useState } from 'react';
import { useSite } from '@/context/SiteContext';
import { Save, Check } from 'lucide-react';

export default function GeneralSettings() {
  const { content, updateBrand, updateMeta, updateSection } = useSite();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [brandForm, setBrandForm] = useState(content.brand);
  const [metaForm, setMetaForm] = useState(content.meta);
  const [sectionsForm, setSectionsForm] = useState(content.sections);

  const handleSaveSettings = () => {
    updateBrand(brandForm);
    updateMeta(metaForm);
    if (sectionsForm.banner) {
      updateSection('banner', sectionsForm.banner);
    }
    if (sectionsForm.aboutArtist) {
      updateSection('aboutArtist', sectionsForm.aboutArtist);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="font-blippo text-2xl text-[#ffe76c]">Studio Brand &amp; Contact Details</h2>
        <p className="text-sm text-yellow-100/70">
          Update phone numbers, WhatsApp links, bio tagline, and browser meta descriptions.
        </p>
      </div>

      <div className="space-y-6 p-6 rounded-2xl bg-[#190626] border border-studio-gold/30 shadow-xl">
        <h3 className="font-blippo text-lg text-studio-gold border-b border-purple-900 pb-2">
          Contact &amp; Identity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Studio Name
            </label>
            <input
              type="text"
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Master Artist / Founder
            </label>
            <input
              type="text"
              value={brandForm.founder}
              onChange={(e) => setBrandForm({ ...brandForm, founder: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={brandForm.tagline}
              onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              WhatsApp Link
            </label>
            <input
              type="text"
              value={brandForm.whatsapp}
              onChange={(e) => setBrandForm({ ...brandForm, whatsapp: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Phone Display
            </label>
            <input
              type="text"
              value={brandForm.phoneDisplay}
              onChange={(e) => setBrandForm({ ...brandForm, phoneDisplay: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Email Address
            </label>
            <input
              type="text"
              value={brandForm.email}
              onChange={(e) => setBrandForm({ ...brandForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Location Label
            </label>
            <input
              type="text"
              value={brandForm.locationLabel}
              onChange={(e) => setBrandForm({ ...brandForm, locationLabel: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Google Maps URL
            </label>
            <input
              type="text"
              value={brandForm.mapsUrl || ''}
              onChange={(e) => setBrandForm({ ...brandForm, mapsUrl: e.target.value })}
              placeholder="https://www.google.com/maps/place/…"
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
            <p className="mt-1 text-[11px] text-yellow-100/40">Shown as a Maps icon in the header and used by the chatbot for directions.</p>
          </div>
        </div>

        <h3 className="font-blippo text-lg text-studio-gold border-b border-purple-900 pb-2 pt-4">
          Hero &amp; Landing Page Content
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Hero Banner Quote
            </label>
            <input
              type="text"
              value={sectionsForm.banner?.quote || ''}
              onChange={(e) =>
                setSectionsForm({
                  ...sectionsForm,
                  banner: { ...sectionsForm.banner, quote: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Hero Badge Text
            </label>
            <input
              type="text"
              value={sectionsForm.banner?.badge || ''}
              onChange={(e) =>
                setSectionsForm({
                  ...sectionsForm,
                  banner: { ...sectionsForm.banner, badge: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              About Artist Biography Headline
            </label>
            <input
              type="text"
              value={sectionsForm.aboutArtist?.headline || ''}
              onChange={(e) =>
                setSectionsForm({
                  ...sectionsForm,
                  aboutArtist: { ...sectionsForm.aboutArtist, headline: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>
        </div>

        <h3 className="font-blippo text-lg text-studio-gold border-b border-purple-900 pb-2 pt-4">
          SEO &amp; Search Visibility
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Browser Title
            </label>
            <input
              type="text"
              value={metaForm.title}
              onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-yellow-200/60 mb-1">
              Search Meta Description
            </label>
            <textarea
              rows={3}
              value={metaForm.description}
              onChange={(e) => setMetaForm({ ...metaForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#260a3a] border border-studio-gold/30 text-yellow-100 text-sm focus:outline-none focus:border-yellow-300"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
              <Check className="w-4 h-4" />
              <span>Saved locally! Click &apos;Review &amp; Commit&apos; when ready.</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm shadow-lg hover:from-amber-400 hover:to-yellow-400 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
