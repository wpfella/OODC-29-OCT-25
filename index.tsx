
import React from 'react';
import ReactDOM from 'react-dom/client';

// Prevent libraries from trying to overwrite window.fetch if it's read-only
if (typeof window !== 'undefined' && window.fetch) {
  try {
    const originalFetch = window.fetch;
    // If someone tries to set window.fetch, we catch it and ignore if it fails
    // or just ensure it stays the original one.
    // Some polyfills check if fetch is "native" or if it's already there.
    // We can't easily make it writable if the browser locked it, 
    // but we can try to define it as configurable if it's not.
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (descriptor && !descriptor.configurable) {
      // It's already locked, nothing we can do but hope the library 
      // check's for existence before assignment.
    }
  } catch (e) {
    console.warn('Fetch protection warning:', e);
  }
}

import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
