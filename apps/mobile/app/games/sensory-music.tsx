import { GameScreenShell } from '@/games/GameScreenShell';
import { SensoryMusicPlayer } from '@/games/SensoryMusicPlayer';
import { usePatient } from '@/patient/PatientProvider';

export default function SensoryMusicScreen() {
  const { patient, ready } = usePatient();
  if (!ready || !patient) {
    return null;
  }

  return (
    <GameScreenShell>
      <SensoryMusicPlayer patient={patient} />
    </GameScreenShell>
  );
}
