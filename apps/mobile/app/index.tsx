import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { usePatient } from '@/patient/PatientProvider';
import { AppRouter } from '@/routing/AppRouter';
import { CaretakerHomeScreen } from '@/screens/CaretakerHomeScreen';

export default function Index() {
  const { user } = useAuth();
  const { refresh } = usePatient();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  if (!user) {
    return null;
  }

  // Caretakers (and admins) land on the console; patients go to the games.
  if (user.role === 'CARETAKER' || user.role === 'ADMIN') {
    return <CaretakerHomeScreen />;
  }

  return <AppRouter tier={user.tier} />;
}
