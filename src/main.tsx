import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from '@/hooks/AuthProvider';
import { ConfigErrorPage } from '@/pages/ConfigErrorPage';
import { env } from '@/lib/env';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const e = error as { status?: number; code?: string };
        // Never retry auth / permission / validation errors.
        if (e.status && e.status < 500) return false;
        if (e.code && /^(42|23|22|P0|PGRST)/.test(e.code)) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {env.isConfigured ? (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={3500}
          toastOptions={{ style: { fontFamily: 'Sarabun, sans-serif', fontSize: '15px' } }}
        />
      </QueryClientProvider>
    ) : (
      <ConfigErrorPage secretDetected={env.hasSecretKey} />
    )}
  </StrictMode>,
);
