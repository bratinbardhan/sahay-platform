import { EnvironmentalSoundMatch } from '@/games/EnvironmentalSoundMatch';
import { GameScreenShell } from '@/games/GameScreenShell';
import { usePatient } from '@/patient/PatientProvider';

export default function EnvironmentalSoundMatchScreen() {
  const { patient, ready } = usePatient();
  if (!ready || !patient) {
    return null;
  }

  return (
    <GameScreenShell>
      <EnvironmentalSoundMatch patient={patient} />
    </GameScreenShell>
  );
}
