import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SyncProvider } from './context/SyncContext.tsx';
import { GlobalStateProvider } from './context/GlobalStateContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SyncProvider>
        <GlobalStateProvider>
          <App />
        </GlobalStateProvider>
      </SyncProvider>
    </AuthProvider>
  </StrictMode>,
);
