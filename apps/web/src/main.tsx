import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { TrackingProvider } from './context/TrackingContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackingProvider>
      <App />
    </TrackingProvider>
  </StrictMode>
);
