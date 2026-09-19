import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Mic, Upload, X } from 'lucide-react';
import { Card } from '@/components/Card';
import { ActionButton } from '@/components/ActionButton';
import { MOCK_MEDIA, type GalleryMediaItem, type MemoryGalleryTag } from '@/lib/mockData';
import { DEMO_PATIENT_ID } from '@/lib/demoSeed';

interface MediaManagerProps {
  onNavigate: (page: string) => void;
}

const FILTERS: Array<'All' | MemoryGalleryTag> = ['All', 'Family', 'Travel', 'Music'];

export function MediaManager({ onNavigate }: MediaManagerProps) {
  const [mediaList, setMediaList] = useState<GalleryMediaItem[]>(MOCK_MEDIA);
  const [filter, setFilter] = useState<'All' | MemoryGalleryTag>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    filter_tag: 'Family' as MemoryGalleryTag,
    audio_note: '',
    file: null as File | null,
    audioFile: null as File | null,
  });

  const visible = useMemo(
    () => (filter === 'All' ? mediaList : mediaList.filter((item) => item.filter_tag === filter)),
    [filter, mediaList]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.file) {
      return;
    }
    setIsUploading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const objectUrl = URL.createObjectURL(form.file);
    const item: GalleryMediaItem = {
      id: `media-${Date.now()}`,
      patient_id: DEMO_PATIENT_ID,
      media_type: form.file.type.startsWith('audio') ? 'VOICE' : 'PHOTO',
      file_url: objectUrl,
      label_text: form.audio_note || form.title,
      relation_tag: form.filter_tag,
      event_year: new Date().getFullYear(),
      checksum_sha256: `sha256-${form.file.name}${form.audioFile ? `-${form.audioFile.name}` : ''}`,
      title: form.title || form.file.name,
      filter_tag: form.filter_tag,
      captured_on: new Date().toISOString(),
    };
    setMediaList((prev) => [item, ...prev]);
    setIsUploading(false);
    setModalOpen(false);
    setForm({ title: '', filter_tag: 'Family', audio_note: '', file: null, audioFile: null });
    showToast('Memory saved — queued for delta sync to the patient album.');
  };

  return (
    <div className="min-h-screen bg-sahay-bg p-4 sm:p-8 animate-fade-in" data-palette="caretaker">
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-sahay-surface border-2 border-sahay-ink text-sahay-ink hover:bg-sahay-surface-sunken transition-all duration-care ease-care"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <h1 className="text-3xl font-bold text-sahay-ink">Reminiscence Media Manager</h1>
      </div>

      <p className="text-sahay-ink/70 mb-6">
        Six historical memories tagged Family, Travel, and Music. Filter the gallery or upload a new
        photo with an optional audio note.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full border-2 text-sm font-semibold min-h-[44px] transition-all duration-care ease-care ${
                filter === tab
                  ? 'bg-sahay-accent text-white border-sahay-ink'
                  : 'bg-sahay-surface text-sahay-ink border-sahay-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <ActionButton
          label="Upload New Memory"
          icon={<Upload className="w-5 h-5 md:w-6 md:h-6" />}
          onClick={() => setModalOpen(true)}
        />
      </div>

      <Card title={`Gallery (${visible.length})`} className="bg-sahay-surface shadow-caretaker-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((item) => (
            <article
              key={item.id}
              className="text-left bg-sahay-surface-raised border-2 border-sahay-ink rounded-xl overflow-hidden shadow-caretaker-card transition-all duration-care ease-care hover:shadow-caretaker-raised"
            >
              {item.media_type === 'PHOTO' ? (
                <img src={item.file_url} alt={item.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 border-b-2 border-sahay-ink flex items-center justify-center bg-sahay-panel">
                  <Mic className="w-5 h-5 md:w-6 md:h-6 text-sahay-ink" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sahay-ink">{item.title}</h3>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-sahay-accent">
                    {item.filter_tag}
                  </span>
                </div>
                <p className="text-xs text-sahay-ink/70 mt-1">{item.label_text}</p>
                <p className="text-xs text-sahay-muted mt-2">
                  {item.event_year ?? new Date(item.captured_on).getFullYear()} ·{' '}
                  {new Date(item.captured_on).toLocaleDateString('en-IN')}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-40 bg-sahay-ink/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-sahay-surface border-2 border-sahay-ink rounded-2xl p-6 shadow-caretaker-raised animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-sahay-ink">Upload New Memory</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg border-2 border-sahay-ink"
                aria-label="Close"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <label className="block text-sm font-semibold text-sahay-ink">
                Title
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface"
                />
              </label>
              <label className="block text-sm font-semibold text-sahay-ink">
                Tag
                <select
                  value={form.filter_tag}
                  onChange={(e) =>
                    setForm({ ...form, filter_tag: e.target.value as MemoryGalleryTag })
                  }
                  className="mt-1 w-full px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface"
                >
                  <option value="Family">Family</option>
                  <option value="Travel">Travel</option>
                  <option value="Music">Music</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-sahay-ink">
                Photo selector
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                  className="mt-1 w-full px-4 py-3 border-2 border-dashed border-sahay-ink rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sahay-accent file:text-white"
                />
              </label>
              <label className="block text-sm font-semibold text-sahay-ink">
                Audio note
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setForm({ ...form, audioFile: e.target.files?.[0] ?? null })}
                  className="mt-1 w-full px-4 py-3 border-2 border-dashed border-sahay-ink rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sahay-accent file:text-white"
                />
                <textarea
                  value={form.audio_note}
                  onChange={(e) => setForm({ ...form, audio_note: e.target.value })}
                  rows={3}
                  placeholder="A short spoken memory to play on the patient tablet…"
                  className="mt-2 w-full px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface"
                />
              </label>
              <div className="flex gap-3">
                <ActionButton label="Cancel" variant="secondary" onClick={() => setModalOpen(false)} />
                <ActionButton
                  type="submit"
                  label={isUploading ? 'Saving…' : 'Save Memory'}
                  icon={<Upload className="w-5 h-5 md:w-6 md:h-6" />}
                  disabled={isUploading}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border-2 border-sahay-ink bg-sahay-surface px-4 py-3 shadow-caretaker-toast animate-slide-up">
          <Check className="w-5 h-5 md:w-6 md:h-6 text-sahay-ok-ink" />
          <span className="text-sm font-semibold text-sahay-ink">{toast}</span>
        </div>
      ) : null}
    </div>
  );
}
