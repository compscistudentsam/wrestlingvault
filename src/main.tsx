import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import { App } from './App';
import './styles.css';

class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('Wrestling Vault renderer error:', error);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <p className="eyebrow">WRESTLING VAULT</p>
          <h1>Let’s get you back to the archive.</h1>
          <p>The interface encountered an unexpected error. No personal data has been changed.</p>
          <button className="button button-gold" onClick={() => window.location.reload()}>
            Reload application
          </button>
        </main>
      );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
