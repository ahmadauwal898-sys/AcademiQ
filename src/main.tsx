import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline capability & device installability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('AcademiQ Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('Native SW registration note:', err);
      });
  });

  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('AcademiQ update available.');
    },
    onOfflineReady() {
      console.log('AcademiQ is ready for offline standalone usage.');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
