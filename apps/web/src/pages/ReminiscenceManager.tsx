import { useEffect, useState } from 'react';
import type { MemoryItemResponse } from '@sahay/types';
import { ChevronLeft, Plus, Volume2, X } from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { API_BASE } from '@/lib/api';
import { DEMO_MEMORIES } from '@/lib/demoSeed';
import { useCaretakerPatient } from '@/lib/useCaretakerPatient';

interface ReminiscenceManagerProps {
  onNavigate: (page: string) => void;
  token: string;
}

/** Fetch a patient's memory vault from the backend, falling back to demo data. */
async function fetchMemories(
  token: string,
  patientId: string
): Promise<MemoryItemResponse[]> {
  const response = await fetch(
    `${API_BASE}/api/v1/patients/${encodeURIComponent(patientId)}/memories`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }
  return (await response.json()) as MemoryItemResponse[];
}

export function ReminiscenceManager({ onNavigate, token }: ReminiscenceManagerProps) {
  const { patient, isDemo: patientIsDemo } = useCaretakerPatient(token);
  const [memories, setMemories] = useState<MemoryItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState<boolean>(patientIsDemo);
  const [modalOpen, setModalOpen] = useState(false);
  const [memoryForm, setMemoryForm] = useState({ title: '', relationship_tag: 'Family', caption_text: '' });

  useEffect(() => {
    if (!patient) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMemories(token, patient.id)
      .then((data) => {
        if (cancelled) return;
        setMemories(data);
        setIsDemo(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMemories(DEMO_MEMORIES);
        setIsDemo(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, patient]);

  return (
    <div className="min-h-screen bg-sahay-bg p-8">
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-sahay-surface border-2 border-sahay-ink text-sahay-ink hover:bg-sahay-surface-sunken"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-sahay-ink">Memory Album</h1>
        {isDemo && (
          <span className="ml-auto rounded-full border-2 border-sahay-accent bg-sahay-surface px-3 py-1 text-xs font-semibold text-sahay-accent">
            Demo data — live vault unavailable
          </span>
        )}
      </div>

      <p className="text-sahay-ink/70 mb-6">
        Curated reminders of happy moments — shared with the patient's mobile album
        for gentle reminiscence therapy sessions.
      </p>

      <div className="mb-8">
        <ActionButton label="Add Memory" icon={<Plus size={20} />} onClick={() => setModalOpen(true)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sahay-ink/70">
          Loading memories…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((memory) => (
            <Card key={memory.id} className="overflow-hidden">
              <img
                src={memory.image_url}
                alt={memory.title}
                className="w-full h-48 object-cover rounded-t-2xl -mt-6 -mx-6 mb-3 border-b-2 border-sahay-ink"
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-sahay-ink">{memory.title}</h3>
                  <p className="text-sm font-semibold text-sahay-accent mt-1">
                    {memory.relationship_tag}
                    {memory.era_or_date ? <span className="text-sahay-ink/60"> · {memory.era_or_date}</span> : null}
                  </p>
                </div>
                {memory.audio_narration_url ? (
                  <span
                    className="p-2 rounded-full bg-sahay-surface border-2 border-sahay-ink text-sahay-accent shrink-0"
                    aria-label="Audio narration available"
                    title="Audio narration available"
                  >
                    <Volume2 size={20} />
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-sahay-ink/70 mt-3">{memory.caption_text}</p>
            </Card>
          ))}
        </div>
      )}
      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Memory</h2>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close add memory dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={(event) => {
              event.preventDefault();
              const item: MemoryItemResponse = {
                id: `memory-${Date.now()}`,
                patient_id: patient?.id ?? 'demo-patient-aditya',
                title: memoryForm.title,
                relationship_tag: memoryForm.relationship_tag,
                era_or_date: new Date().getFullYear().toString(),
                image_url: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420"><rect width="800" height="420" fill="#0D9488"/><circle cx="400" cy="180" r="90" fill="#FEF3C7"/><path d="M340 250 Q400 290 460 250" fill="none" stroke="#0F172A" stroke-width="10"/><text x="400" y="370" text-anchor="middle" fill="white" font-size="30">New Sahāy memory</text></svg>')}`,
                audio_narration_url: null,
                caption_text: memoryForm.caption_text,
                created_at: new Date().toISOString(),
              };
              setMemories((current) => [item, ...current]);
              setMemoryForm({ title: '', relationship_tag: 'Family', caption_text: '' });
              setModalOpen(false);
            }} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Title<input required value={memoryForm.title} onChange={(event) => setMemoryForm({ ...memoryForm, title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm font-semibold text-slate-700">Relationship<select value={memoryForm.relationship_tag} onChange={(event) => setMemoryForm({ ...memoryForm, relationship_tag: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option>Family</option><option>Travel</option><option>Music</option></select></label>
              <label className="block text-sm font-semibold text-slate-700">Caption<textarea required value={memoryForm.caption_text} onChange={(event) => setMemoryForm({ ...memoryForm, caption_text: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <button type="submit" className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800">Save memory</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}