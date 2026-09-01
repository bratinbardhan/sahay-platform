import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { usePatient } from '@/patient/PatientProvider';
import { AppRouter } from '@/routing/AppRouter';

export default function Index() {
  const { refresh } = usePatient();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return <AppRouter />;
}
