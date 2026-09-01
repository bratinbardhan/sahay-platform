import { GameScreenShell } from '@/games/GameScreenShell';
import { RapidFireSorting } from '@/games/RapidFireSorting';
import { usePatient } from '@/patient/PatientProvider';

export default function RapidFireSortingScreen() {
  const { patient, ready } = usePatient();
  if (!ready || !patient) {
    return null;
  }

  return (
    <GameScreenShell>
      <RapidFireSorting patient={patient} />
    </GameScreenShell>
  );
}
