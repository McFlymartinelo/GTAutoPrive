import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import LiveApp from './live/LiveApp.jsx';

// `#demo` = mode démonstration (données en mémoire) ; sinon application réelle (API + base de données).
function Root() {
  const [demo, setDemo] = useState(location.hash === '#demo');
  useEffect(() => {
    const on = () => setDemo(location.hash === '#demo');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return demo ? (
    <StoreProvider>
      <App />
    </StoreProvider>
  ) : (
    <LiveApp />
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
