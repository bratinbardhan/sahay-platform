import { GameScreenShell } from '@/games/GameScreenShell';
import { SerialNumberScatter } from '@/games/SerialNumberScatter';
import { usePatient } from '@/patient/PatientProvider';

export default function SerialNumberScatterScreen() {
  const { patient, ready } = usePatient();
  if (!ready || !patient) {
    return null;
  }

  return (
    <GameScreenShell>
      <SerialNumberScatter patient={patient} />
    </GameScreenShell>
  );
}
