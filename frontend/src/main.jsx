import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are bundled into the app, so the display works without internet
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';

import App from './App.jsx';
import './styles.css';

// Colour theme: 'navy', 'charcoal', 'peacock', 'purple', 'blue' or 'light' (see styles.css).
// To try another without building again, add ?theme=peacock to the URL.
const THEME = 'light';
document.documentElement.dataset.theme =
  new URLSearchParams(window.location.search).get('theme') || THEME;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
