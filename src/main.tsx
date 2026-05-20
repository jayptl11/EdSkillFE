import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { BrowserRouter } from 'react-router-dom'
import { pruneForeignAuthCaches } from './api/cacheLifecycle'
import { queryClient, queryPersistOptions } from './api/queryClient'
import '@fontsource-variable/nunito-sans/wght.css'
import './index.css'
import App from './App.tsx'
import { useAppStore } from './store/useAppStore'

void pruneForeignAuthCaches(useAppStore.getState().session?.userId ?? null)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
