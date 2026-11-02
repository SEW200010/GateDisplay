import { useEffect, useState } from 'react';
import Clock from './Clock.jsx';
import AdScreen, { AdPreload } from './AdScreen.jsx';
import FitText from './FitText.jsx';
import useDisplayData from './useDisplayData.js';

// Images live in frontend/public/images/
const DEFAULT_LOGO = '/images/logo.png'; // when there is no logo for the airline
const DEFAULT_GATE_IMAGE = '/images/gate-bg.jpg'; // when there is no image for the city

// Messages that scroll along the footer
const TICKER_MESSAGES = [
  'Please have your boarding pass and passport ready',
  'Have a pleasant journey',
];
// Remark written any way -> tidy text on screen:
// "gate open" / "GATE OPEN" -> "Gate Open", "delayed until 10:20am" -> "Delayed Until 10:20AM"
function formatRemark(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)([a-z])/g, (m, space, c) => space + c.toUpperCase())
    .replace(/(\d)(am|pm)\b/g, (m, d, ap) => d + ap.toUpperCase());
}
// "UL102" -> "UL 102"
function formatFlight(code) {
  if (!code) return '';
  const m = String(code).trim().match(/^([A-Z0-9]{2})\s*(\d+[A-Z]?)$/i);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : String(code).trim();
}

// "6" -> "06", "A6" stays "A6"
function formatGate(gate) {
  if (!gate) return '--';
  const g = String(gate).trim();
  return /^\d$/.test(g) ? `0${g}` : g;
}

// "QR1234, EK652" -> "QR 1234 · EK 652"
function formatCodeShares(cs) {
  if (!cs) return '';
  return String(cs)
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(formatFlight)
    .join(' · ');
}

// Colour of the status band, picked from its text
function statusClass(remark) {
  const r = String(remark || '').toLowerCase();
  if (r.startsWith('delayed')) return 'status-delayed';
  if (r.includes('final')) return 'status-final';
  if (r.includes('closed')) return 'status-closed';
  if (r.includes('boarding') && !r.includes('wait')) return 'status-boarding';
  if (r.includes('open')) return 'status-open';
  return 'status-scheduled';
}

// Airline code for the logo: AIRLINE_CODE, or when it is empty the first 2 letters of the flight ("UL102" -> "UL")
function airlineCodeOf(f) {
  if (!f) return '';
  const code = String(f.airline || '').trim();
  if (code) return code.toUpperCase();
  const m = String(f.flight || '').trim().match(/^([A-Z0-9]{2})/i);
  return m ? m[1].toUpperCase() : '';
}

// City pictures to try, in order. The first file that exists is shown:
//   cities/DOH.png  (icon, transparent)  -> shown whole on the navy panel
//   cities/DOH.jpg  (photo)              -> fills the panel
//   then the same two by city name (Doha.png, Doha.jpg), then gate-bg.jpg
function cityImageCandidates(f) {
  const list = [];
  const code = String(f?.cityCode || '').trim().toUpperCase();
  const name = String(f?.city || '').trim();
  for (const base of [code && code !== 'XXX' ? code : '', name]) {
    if (!base) continue;
    list.push({ src: `/images/cities/${encodeURIComponent(base)}.png`, icon: true });
    list.push({ src: `/images/cities/${encodeURIComponent(base)}.jpg`, icon: false });
  }
  return list;
}

function imageExists(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// Right panel picture under the gate number
function CityPicture({ flight }) {
  const candidates = cityImageCandidates(flight);
  const key = candidates.map((c) => c.src).join('|');
  const [picture, setPicture] = useState(null); // null while looking

  useEffect(() => {
    let cancelled = false;
    setPicture(null);
    (async () => {
      for (const c of candidates) {
        if (await imageExists(c.src)) {
          if (!cancelled) setPicture(c);
          return;
        }
        if (cancelled) return;
      }
      if (!cancelled) setPicture({ src: DEFAULT_GATE_IMAGE, icon: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`gate-image ${picture?.icon ? 'gate-image-icon' : ''}`}
      style={{ backgroundImage: picture ? `url("${picture.src}")` : 'none' }}
    />
  );
}

// True when the expected time (ETD) is not the scheduled time (STD)
function isDelayed(f) {
  if (!f.etdTime || !f.stdTime) return false;
  const sameDay = !f.etdDate || !f.stdDate || f.etdDate === f.stdDate;
  return !(sameDay && f.etdTime === f.stdTime);
}

// Logo of the flight's airline. A logo can be .svg OR .png:
//   /images/airlines/UL.svg  -> not there? ->  /images/airlines/UL.png  -> not there? -> default logo
// Light theme looks in /images/airlines-light/ (logos with DARK letters) and uses logo-light.png.
const LOGO_TYPES = ['svg', 'png']; // tried in this order
const LIGHT_THEMES = ['light'];
const DEFAULT_LOGO_LIGHT = '/images/logo-light.png';

function logoCandidates(code) {
  const light = LIGHT_THEMES.includes(document.documentElement.dataset.theme);
  const c = code ? String(code).trim().toUpperCase() : '';
  const list = c ? LOGO_TYPES.map((ext) => `/images/airlines/${c}.${ext}`) : [];
  if (light) list.push(DEFAULT_LOGO_LIGHT);
  list.push(DEFAULT_LOGO);
  return list;
}

function AirlineLogo({ code }) {
  const sources = logoCandidates(code);
  const key = sources.join('|');
  // index = which file in the list is being tried; starts again at 0 when the airline changes
  const [tried, setTried] = useState({ key, index: 0 });
  const index = tried.key === key ? tried.index : 0;

  return (
    <img
      className="logo"
      src={sources[index]}
      alt=""
      onError={() => {
        if (index < sources.length - 1) setTried({ key, index: index + 1 });
      }}
    />
  );
}

function Message({ title, detail }) {
  return (
    <div className="message">
      <div className="message-title">{title}</div>
      {detail && <div className="message-detail">{detail}</div>}
    </div>
  );
}

function Card({ label, watch, valueClass = '', cardClass = '', children }) {
  return (
    <div className={`card ${cardClass}`}>
      <div className="card-label">{label}</div>
      <FitText className={`card-value ${valueClass}`} watch={watch}>
        {children}
      </FitText>
    </div>
  );
}

function FlightInfo({ flight }) {
  const delayed = isDelayed(flight);
  const scheduledTime = flight.stdTime || flight.departureTime;
  const codeShares = formatCodeShares(flight.codeShare);
  const extra = [flight.via && `via ${flight.via}`, codeShares && `Also: ${codeShares}`]
    .filter(Boolean)
    .join('     ·     ');

  return (
    <>
      <div className="destination">
        <div className="label">Destination</div>
        <FitText className="city" watch={`${flight.city}|${flight.cityCode}`}>
          {flight.city}
          {flight.cityCode && String(flight.cityCode).trim().toUpperCase() !== 'XXX' && (
            <span className="city-code">{flight.cityCode}</span>
          )}
        </FitText>
        {extra && <div className="route-extra">{extra}</div>}
      </div>

      <div className="cards">
        <Card label="FLIGHT" watch={flight.flight}>
          {formatFlight(flight.flight)}
        </Card>
        <Card label="DEPARTURE" watch={`${scheduledTime}|${delayed}`}>
          {delayed ? <s>{scheduledTime}</s> : scheduledTime}
        </Card>
        {delayed && (
          <Card label="NEW TIME" watch={flight.etdTime} valueClass="value-delayed" cardClass="card-delayed">
            {flight.etdTime}
          </Card>
        )}
      </div>

      <div className={`status ${statusClass(flight.remark)}`}>
                <FitText className="status-text" watch={flight.remark}>
          {formatRemark(flight.remark)}
        </FitText>
        {/* e.g. 'Delayed Until 10:20AM' from REMARKS2 */}
        {flight.note && <div className="status-note">{formatRemark(flight.note)}</div>}
      </div>
    </>
  );
}

// The footer text runs twice in a row, so the scroll loops without a gap
function Ticker() {
  const copy = [...TICKER_MESSAGES, ...TICKER_MESSAGES];
  return (
    <div className="ticker">
      {[0, 1].map((n) => (
        <div className="ticker-copy" key={n} aria-hidden={n === 1}>
          {copy.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// The normal gate screen: logo, clock, flight details, gate number and city image
function Board({ gate, flight, contentKey, body, offline }) {
  return (
    <div className="screen">
      <section className="left">
        <header className="topbar">
          <AirlineLogo code={airlineCodeOf(flight)} />
          <Clock />
        </header>
        <main className="content" key={contentKey}>
          {body}
        </main>
        <footer className="footer">
          <Ticker />
          {offline && <span className="offline-dot" title="Server unreachable" />}
        </footer>
      </section>

      <aside className="right">
        <div className="gate-box">
          <div className="gate-label">GATE</div>
          <div className="gate-number">{formatGate(gate)}</div>
        </div>
        {/* City icon or photo; gate-bg.jpg when the city has none */}
        <CityPicture flight={flight} />
      </aside>
    </div>
  );
}

export default function App() {
  const { data, offline } = useDisplayData();

  const flight = data?.flight;
  const gate = flight?.gate || data?.display?.gates?.[0];

  // No flight in its time window: full-screen advert video, with the gate number,
  // the next flight and the clock in a strip underneath.
  // The 15-second refresh keeps this same video playing, it does not restart.
  if (data?.status === 'NO_FLIGHT') {
    const n = data.nextFlight;
    const next = n ? { flight: formatFlight(n.flight), city: n.city, time: n.departureTime } : null;
    return (
      <AdScreen
        gate={formatGate(gate)}
        next={next}
        offline={offline}
        fallback={
          <Board
            gate={gate}
            offline={offline}
            contentKey="welcome"
            body={<Message title="Welcome" detail="No flight is assigned to this gate right now" />}
          />
        }
      />
    );
  }

  let body;
  if (!data) {
    body = <Message title="Loading..." />;
  } else if (data.status === 'OK') {
    body = <FlightInfo flight={flight} />;
  } else if (data.status === 'UNKNOWN_DISPLAY') {
    body = <Message title="Display not configured" detail={`IP ${data.ip} is not in tblGateDisplays`} />;
  } else if (data.status === 'DISPLAY_DISABLED') {
    body = <Message title="Display disabled" detail={`IP ${data.ip}`} />;
  } else {
    body = <Message title="Server error" detail={data.error} />;
  }

  return (
    <>
      <Board
        gate={gate}
        flight={flight}
        contentKey={data?.status === 'OK' && flight ? `flight-${flight.id}` : data?.status || 'loading'}
        body={body}
        offline={offline}
      />
      {/* Loads the advert in the background, so it plays at once when this flight goes off */}
      <AdPreload />
    </>
  );
}