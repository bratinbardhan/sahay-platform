import { useState } from 'react';
import { Dashboard } from '@/pages/Dashboard';
import { AnalyticsChart } from '@/pages/AnalyticsChart';
import { MediaManager } from '@/pages/MediaManager';
import { GeofenceMap } from '@/pages/GeofenceMap';

type Page = 'dashboard' | 'analytics' | 'media' | 'geofence';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  const navigate = (next: string) => {
    setPage(next as Page);
  };

  switch (page) {
    case 'analytics':
      return <AnalyticsChart onNavigate={navigate} />;
    case 'media':
      return <MediaManager onNavigate={navigate} />;
    case 'geofence':
      return <GeofenceMap onNavigate={navigate} />;
    default:
      return <Dashboard onNavigate={navigate} />;
  }
}

export default App;
