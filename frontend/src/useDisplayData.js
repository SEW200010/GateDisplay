import { useEffect, useState } from 'react';

// How often the display asks the server for news.
// A remark changed in the database shows on screen within this time (1000 = 1 second).
const REFRESH_MS = 1000;

// Server unreachable for longer than this -> reload the page once it comes back,
// so the screen always runs the latest version of the app.
const RELOAD_AFTER_OFFLINE_MS = 2 * 60 * 1000;

// Time until the next REFRESH_MS mark of the SERVER clock (+0.1 s), so every display refreshes together.
function delayToNextTick(offsetMs) {
  const serverNow = Date.now() + offsetMs;
  return REFRESH_MS - (serverNow % REFRESH_MS) + 100;
}

export default function useDisplayData() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const ipOverride = new URLSearchParams(window.location.search).get('ip');
    const url = ipOverride ? `/api/display?ip=${encodeURIComponent(ipOverride)}` : '/api/display';
    let cancelled = false;
    let timer = null;
    let offsetMs = 0; // server clock minus this screen's clock
    let offlineSince = null;

    async function load() {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;

        if (offlineSince && Date.now() - offlineSince > RELOAD_AFTER_OFFLINE_MS) {
          window.location.reload(); // server is back after a long break
          return;
        }
        offlineSince = null;

        const serverMs = Date.parse(json.serverTime);
        if (Number.isFinite(serverMs)) offsetMs = serverMs - Date.now();
        setData(json);
        setOffline(false);
      } catch {
        if (cancelled) return;
        if (!offlineSince) offlineSince = Date.now();
        setOffline(true); // keep showing the last data, with the red dot
      }
      if (!cancelled) timer = setTimeout(load, delayToNextTick(offsetMs));
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, offline };
}