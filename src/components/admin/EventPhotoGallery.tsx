'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Images, Loader2, Trash2, Upload, X } from 'lucide-react';

type Photo = { src: string; title: string };
interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  upload: (file: File) => Promise<string>;
  gallery: Photo[];
  onBusy?: (busy: boolean) => void;
}

/** No CMS dependencies: both studio consoles use the same small editor. */
export default function EventPhotoGallery({ images, onChange, upload, gallery, onBusy }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const previews = useRef<Record<string, string>>({});
  useEffect(() => () => { Object.values(previews.current).forEach(URL.revokeObjectURL); }, []);
  const current = useRef(images);
  current.current = images;
  const uploadLock = useRef(false);
  const dragIndex = useRef<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const controls = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#250a3b] px-3 text-xs font-semibold text-[#ffe76c] disabled:opacity-40';
  const change = (next: string[]) => { current.current = next; onChangeRef.current(next); };
  const move = (from: number, to: number) => {
    if (busy || from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    next.splice(to, 0, next.splice(from, 1)[0]);
    change(next);
  };
  const uploadFiles = async (files: File[]) => {
    if (uploadLock.current || !files.length) return;
    uploadLock.current = true;
    setBusy(true);
    onBusy?.(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Choose JPG, PNG, WebP, AVIF or GIF photos up to 12 MB.');
        setStatus(`Optimizing and uploading photo ${uploaded + 1} of ${files.length}…`);
        const src = await upload(file);
        previews.current[src] = URL.createObjectURL(file);
        change([...current.current, src]);
        uploaded++;
      }
      setStatus(`${uploaded} photo${uploaded === 1 ? '' : 's'} uploaded. Save and publish the event to attach them to the website.`);
    } catch (error) {
      setStatus(`${uploaded ? `${uploaded} photos kept. ` : ''}${error instanceof Error ? error.message : 'Upload failed. Please retry.'}`);
    } finally {
      uploadLock.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  };
  const openPreview = (src: string) => { setPreview(previews.current[src] || src); dialog.current?.showModal(); };
  return <div className="event-photo-editor space-y-3 text-[#f8f1d5]">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Event photo gallery</h3><span className="text-xs text-[#ffe76c]/70">{images.length} attached · first photo is the cover</span></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((src, i) => <article key={`${src}-${i}`} draggable={!busy} onDragStart={() => { dragIndex.current = i; }} onDragEnd={() => { dragIndex.current = null; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (dragIndex.current !== null) move(dragIndex.current, i); }} className="relative overflow-hidden rounded-xl border border-[#d4af37]/30 bg-[#180626]">
        <button type="button" onClick={() => openPreview(src)} className="relative block aspect-[4/3] w-full" aria-label={`Preview event photo ${i + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previews.current[src] || src} alt={`Event photo ${i + 1}`} className="h-full w-full object-cover" onLoad={(event) => { const img = event.currentTarget; setSizes((prev) => ({ ...prev, [src]: `${img.naturalWidth} × ${img.naturalHeight}` })); }} />
          <span className="absolute bottom-1 left-1 rounded bg-black/80 px-2 py-1 text-[10px]">#{i + 1}{i === 0 ? ' · Cover' : ''}</span>
        </button>
        <p className="px-2 pt-1 text-[10px] text-[#ffe76c]/70">{sizes[src] || 'Loading preview…'}</p>
        <div className="flex items-center justify-between gap-1 p-1">
          <button type="button" className={controls + ' !px-1'} disabled={busy || i === 0} onClick={() => move(i, i - 1)} aria-label={`Move photo ${i + 1} earlier`}><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" className={controls + ' !px-1'} disabled={busy || i === images.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move photo ${i + 1} later`}><ArrowRight className="h-4 w-4" /></button>
          <button type="button" className={controls + ' absolute right-1 top-1 !bg-[#180626]/90 !px-1 !text-red-300'} disabled={busy} onClick={() => change(images.filter((_, at) => at !== i))} aria-label={`Remove photo ${i + 1} from this event`}><Trash2 className="h-4 w-4" /></button>
        </div>
      </article>)}
    </div>
    {!images.length && <p className="text-xs text-[#ffe76c]/60">No photos yet. Upload from your device or select studio images.</p>}
    <div onDragOver={(event) => { event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); void uploadFiles(Array.from(event.dataTransfer.files)); }} className="rounded-xl border border-dashed border-[#d4af37]/50 bg-[#250a3b]/50 p-3">
      <div className="flex flex-wrap gap-2">
        <label className={controls + (busy ? ' cursor-wait' : ' cursor-pointer')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? 'Uploading…' : 'Upload photos'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple disabled={busy} className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void uploadFiles(files); }} />
        </label>
        <button type="button" disabled={busy} className={controls} aria-expanded={picker} onClick={() => setPicker(!picker)}><Images className="h-4 w-4" />Select from Studio Gallery</button>
      </div>
      <p className="mt-2 text-[11px] text-[#ffe76c]/60">Drop photos here. Drag thumbnails to reorder, or use arrows on touch and keyboard.</p>
    </div>
    <p role="status" aria-live="polite" className="text-xs text-[#ffe76c]/80">{status}</p>
    {picker && <div data-scrollable="true" className="max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-[#d4af37]/30 p-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{gallery.filter((photo, index, all) => all.findIndex((p) => p.src === photo.src) === index).map((photo) => <button type="button" key={photo.src} disabled={images.includes(photo.src)} onClick={() => { change([...current.current, photo.src]); }} className="overflow-hidden rounded-lg border border-[#d4af37]/30 text-left disabled:opacity-40" aria-label={`Attach ${photo.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="" loading="lazy" className="aspect-square w-full object-cover" /><span className="block truncate px-1 py-2 text-[11px]">{photo.title}</span>
      </button>)}</div>
    </div>}
    <dialog data-scrollable="true" ref={dialog} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(90vw,800px)] overflow-auto rounded-2xl border border-[#d4af37]/50 bg-[#180626] p-3 text-[#ffe76c] backdrop:bg-black/80" aria-label="Event photo preview">
      <button type="button" onClick={() => dialog.current?.close()} className={controls + ' mb-2 ml-auto flex'} aria-label="Close photo preview"><X className="h-5 w-5" /></button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt="Full event photo preview" className="max-h-[70dvh] w-full object-contain" />}
    </dialog>
  </div>;
}
