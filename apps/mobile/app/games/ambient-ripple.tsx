import { AmbientRippleScreensaver } from '@/games/AmbientRippleScreensaver';
import { GameScreenShell } from '@/games/GameScreenShell';
import { usePatient } from '@/patient/PatientProvider';

export default function AmbientRippleScreen() {
  const { patient, ready } = usePatient();
  if (!ready || !patient) {
    return null;
  }

  return (
    <GameScreenShell>
      <AmbientRippleScreensaver patient={patient} />
    </GameScreenShell>
  );
}
