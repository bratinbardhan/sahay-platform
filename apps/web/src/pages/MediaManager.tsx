import { useState } from 'react';
import type { ReminiscenceMedia } from '@sahay/types';
import { ChevronLeft, Upload, Mic, Save } from 'lucide-react';
import { Card } from '@/components/Card';
import { ActionButton } from '@/components/ActionButton';
import { MOCK_MEDIA } from '@/lib/mockData';

interface MediaManagerProps { onNavigate: (page: string) => void; }

export function MediaManager({ onNavigate }: MediaManagerProps) {
  const [mediaList, setMediaList] = useState<ReminiscenceMedia[]>(MOCK_MEDIA);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lastSyncPayload, setLastSyncPayload] = useState<ReminiscenceMedia | null>(null);

  const [form, setForm] = useState({
    relation_tag: '', event_year: '', label_text: '',
    media_type: 'PHOTO' as 'PHOTO' | 'VOICE', file: null as File | null,
  });

    const mockUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsUploading(false);
    return `https://s3.sahay.local/reminiscence/${file.name}-${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) return;
    const fileUrl = await mockUpload(form.file);
    const newMedia: ReminiscenceMedia = {
      id: `media-${Date.now()}`,
      patient_id: 'patient-001',
      media_type: form.media_type,
      file_url: fileUrl,
      label_text: form.label_text,
      relation_tag: form.relation_tag,
      event_year: form.event_year ? parseInt(form.event_year, 10) : null,
      checksum_sha256: 'sha256-placeholder',
    };
    setMediaList([newMedia, ...mediaList]);
    setLastSyncPayload(newMedia);
    setShowForm(false);
    setForm({ relation_tag: '', event_year: '', label_text: '', media_type: 'PHOTO', file: null });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 overflow-x-hidden animate-in">
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-white border-2 border-slate-300 text-slate-800 hover:bg-slate-200"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-slate-800">Reminiscence Media Manager</h1>
      </div>

      <p className="text-slate-800/70 mb-6">
        Upload family photos and voice notes. These sync to the patient's mobile app
        for Face &amp; Name Match and Environmental Sound games.
      </p>

      {!showForm && (
        <ActionButton label="Add New Media" icon={<Upload size={20} />} onClick={() => setShowForm(true)} className="mb-6" />
      )}

      {showForm && (
        <Card title="Upload New Media" className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Relation Tag</label>
                <input type="text" value={form.relation_tag}
                  onChange={(e) => setForm({ ...form, relation_tag: e.target.value })}
                  placeholder="e.g., Grandson Rahul" required
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Event Year</label>
                <input type="number" value={form.event_year}
                  onChange={(e) => setForm({ ...form, event_year: e.target.value })}
                  placeholder="e.g., 2023" min="1900" max="2030"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Label Text</label>
                <input type="text" value={form.label_text}
                  onChange={(e) => setForm({ ...form, label_text: e.target.value })}
                  placeholder="e.g., Rahul at school graduation" required
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Media Type</label>
                <select value={form.media_type}
                  onChange={(e) => setForm({ ...form, media_type: e.target.value as 'PHOTO' | 'VOICE' })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="PHOTO">Photo</option>
                  <option value="VOICE">Voice Note</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  {form.media_type === 'PHOTO' ? 'Photo File' : 'Voice Note File'}
                </label>
                <input type="file"
                  accept={form.media_type === 'PHOTO' ? 'image/*' : 'audio/*'}
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} required
                  className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl bg-white text-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <ActionButton label="Cancel" variant="secondary" onClick={() => setShowForm(false)} />
              <ActionButton
                type="submit"
                label={isUploading ? 'Uploading…' : 'Save Media'}
                icon={<Save size={20} />}
                disabled={isUploading}
              />
            </div>
          </form>
        </Card>
      )}

      {/* Sync payload preview */}
      {lastSyncPayload && (
        <Card title="Prepared Sync Payload — POST /api/v1/reminiscence/media" className="mb-8">
          <pre className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs text-slate-800 overflow-x-auto">
            {JSON.stringify(lastSyncPayload, null, 2)}
          </pre>
          <p className="text-xs text-slate-800/60 mt-2">
            This payload conforms to the backend <code>ReminiscenceMedia</code> schema and is queued
            for the offline-first delta sync whenever connectivity is available.
          </p>
        </Card>
      )}

      {/* Media List */}
      <Card title={`Uploaded Media (${mediaList.length})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaList.map((m) => (
            <div key={m.id} className="text-center p-4 bg-white border border-slate-200 rounded-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
              {m.media_type === 'PHOTO' ? (
                <img src={m.file_url} alt={m.label_text} className="w-full h-32 object-cover rounded-lg mb-2 border-2 border-slate-300" />
              ) : (
                <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg mb-2 flex items-center justify-center">
                  <Mic size={40} className="text-slate-800" />
                </div>
              )}
              <div className="font-bold text-slate-800">{m.relation_tag}</div>
              <div className="text-xs text-slate-800/70 mt-1">{m.label_text}</div>
              <div className="text-xs text-teal-600 font-medium">{m.event_year}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

