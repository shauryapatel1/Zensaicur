import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App.tsx';
import './index.css';

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "", // Replace with your actual DSN in .env
  integrations: [
    new BrowserTracing({
      // Set tracePropagationTargets to control for which URLs trace propagation should be enabled
      tracePropagationTargets: ["localhost", /^https:\/\/zensai\.me/],
    }),
  ],
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  // We recommend adjusting this value in production
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  // Capture 100% of sessions for session replay in development, less in production
  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  // If the entire session is not sampled, use the below sample rate to be sure
  // to get a sample of error sessions
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE, // 'development' or 'production'
  release: 'zensai@1.0.0', // Update this with your app version
  // Enable debug in development mode
  debug: import.meta.env.DEV,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
