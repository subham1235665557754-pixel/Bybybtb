import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle HTML5 media playback aborts gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.name === 'AbortError' ||
        (typeof reason.message === 'string' &&
          (reason.message.includes('interrupted by a call to pause') ||
            reason.message.includes('media was removed from the document') ||
            reason.message.includes('interrupted'))))
    ) {
      event.preventDefault(); // Cleanly prevent unhandled DOMException error banner
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
