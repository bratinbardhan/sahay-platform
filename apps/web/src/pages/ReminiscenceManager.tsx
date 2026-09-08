import { useEffect, useState } from 'react';
import type { MemoryItemResponse } from '@sahay/types';
import { ChevronLeft, Plus, Volume2 } from 'lucide-react';
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
        <h1 className="text-3xl font-bold text-slate-800">Memory Album</h1>
        {isDemo && (
          <span className="ml-auto rounded-full border-2 border-teal-600 bg-white px-3 py-1 text-xs font-semibold text-teal-600">
            Demo data — live vault unavailable
          </span>
        )}
      </div>

      <p className="text-slate-800/70 mb-6">
        Curated reminders of happy moments — shared with the patient's mobile album
        for gentle reminiscence therapy sessions.
      </p>

      {/* UI-only scaffold: ingestion flow arrives in a later phase. */}
      <div className="mb-8">
        <ActionButton label="Add Memory" icon={<Plus size={20} />} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-800/70">
          Loading memories…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.map((memory) => (
            <Card key={memory.id} className="overflow-hidden">
              <img
                src={memory.image_url}
                alt={memory.title}
                className="w-full h-48 object-cover rounded-t-2xl -mt-6 -mx-6 mb-3 border-b-2 border-slate-300"
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{memory.title}</h3>
                  <p className="text-sm font-semibold text-teal-600 mt-1">
                    {memory.relationship_tag}
                    {memory.era_or_date ? <span className="text-slate-800/60"> · {memory.era_or_date}</span> : null}
                  </p>
                </div>
                {memory.audio_narration_url ? (
                  <span
                    className="p-2 rounded-full bg-white border-2 border-slate-300 text-teal-600 shrink-0"
                    aria-label="Audio narration available"
                    title="Audio narration available"
                  >
                    <Volume2 size={20} />
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-slate-800/70 mt-3">{memory.caption_text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}