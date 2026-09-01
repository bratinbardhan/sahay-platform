import { FaceNameMatch } from '@/games/FaceNameMatch';
import { GameScreenShell } from '@/games/GameScreenShell';
import { usePatient } from '@/patient/PatientProvider';

export default function FaceNameMatchScreen() {
  const { patient, ready } = usePatient();
  if (!ready || !patient) {
    return null;
  }

  return (
    <GameScreenShell>
      <FaceNameMatch patient={patient} />
    </GameScreenShell>
  );
}
