import React from 'react';
import ReactDOM from 'react-dom/client';
import AgenticStudioApp from './AgenticStudioApp';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AgenticStudioApp />
    </ErrorBoundary>
  </React.StrictMode>
);